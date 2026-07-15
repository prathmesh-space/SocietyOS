import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Unit from '@/models/Unit';
import Society from '@/models/Society';
import MaintenanceBill from '@/models/MaintenanceBill';
import { withAuth } from '@/lib/auth/middleware';
import { generateBillsSchema } from '@/lib/validation/bill';
import { logAuditEvent } from '@/lib/audit/logger';

// POST /api/admin/bills/generate — Bulk generate bills for a billing period
export const POST = withAuth(
  async (req, { auth }) => {
    try {
      const body = await req.json();
      const validation = generateBillsSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const { billingPeriod, dueDate, overrides } = validation.data;

      await dbConnect();

      // Check if any bills already exist for this billingPeriod in this society.
      // The scoping plugin will automatically filter this query by the current societyId.
      const existingBill = await MaintenanceBill.findOne({ billingPeriod }).lean();
      if (existingBill) {
        return NextResponse.json(
          { error: `Bills have already been generated for the period ${billingPeriod} in this society` },
          { status: 409 }
        );
      }

      // Fetch society details to get default bill amount
      // Since Society model is the tenant root, queries are unscoped by default, so we query by ID
      const society = await Society.findById(auth.societyId).lean();
      if (!society) {
        return NextResponse.json({ error: 'Society not found' }, { status: 404 });
      }

      const defaultAmount = society.defaultBillAmount || 0;

      // Fetch all active units in this society
      const activeUnits = await Unit.find({ active: true }).lean();
      if (activeUnits.length === 0) {
        return NextResponse.json(
          { error: 'No active units found in this society to bill' },
          { status: 400 }
        );
      }

      // Build override map
      const overrideMap = new Map<string, number>();
      for (const ov of overrides) {
        overrideMap.set(ov.unitId, ov.amount);
      }

      // Build bills list
      const billsToCreate = activeUnits.map((unit) => {
        const unitIdStr = unit._id.toString();
        const amount = overrideMap.has(unitIdStr)
          ? overrideMap.get(unitIdStr)!
          : defaultAmount;

        return {
          societyId: auth.societyId,
          unitId: unit._id,
          billingPeriod,
          amount,
          dueDate,
          status: 'Unpaid',
          lateFeeApplied: false,
          lateFeeAmount: 0,
        };
      });

      // Insert bills
      const createdBills = await MaintenanceBill.insertMany(billsToCreate);

      // Log the batch generation in AuditLog (AuditLog stub)
      await logAuditEvent({
        action: 'bill.generate',
        entityType: 'MaintenanceBill',
        entityId: createdBills[0]?._id, // Reference primary record in the batch
        afterState: {
          billingPeriod,
          totalBillsGenerated: createdBills.length,
          totalAmount: createdBills.reduce((sum, b) => sum + b.amount, 0),
        },
        actorId: auth.userId,
        societyId: auth.societyId!,
      });

      return NextResponse.json(
        {
          message: `${createdBills.length} maintenance bills generated successfully`,
          billingPeriod,
          count: createdBills.length,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('[Admin:Billing] Error generating bills:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin'] }
);
