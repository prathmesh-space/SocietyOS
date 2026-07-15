import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Receipt from '@/models/Receipt';
import MaintenanceBill from '@/models/MaintenanceBill';
import { withAuth } from '@/lib/auth/middleware';

// GET /api/resident/receipts/[id] — Download/view receipt details
export const GET = withAuth(
  async (req, { params, auth }) => {
    try {
      await dbConnect();

      // Find the receipt. Scoping plugin scopes this to current societyId.
      const receipt = await Receipt.findById(params.id);
      if (!receipt) {
        return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
      }

      // Find associated bill to verify unit ownership
      const bill = await MaintenanceBill.findById(receipt.billId);
      if (!bill) {
        return NextResponse.json({ error: 'Associated bill not found' }, { status: 404 });
      }

      // If user is resident, they can only view receipts for their own unit
      if (auth.role === 'resident') {
        if (!auth.unitId || bill.unitId.toString() !== auth.unitId.toString()) {
          return NextResponse.json(
            { error: 'Forbidden: You can only access receipts for your own unit' },
            { status: 403 }
          );
        }
      }

      // Admins of the same society can also access it, which is allowed by scoping

      return NextResponse.json({
        receipt: receipt.toJSON(),
        bill: {
          id: bill._id,
          billingPeriod: bill.billingPeriod,
          amount: bill.amount,
        },
      });
    } catch (error) {
      console.error('[Resident:Receipts] GET error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
