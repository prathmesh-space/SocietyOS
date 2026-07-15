import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Society from '@/models/Society';
import { withAuth } from '@/lib/auth/middleware';
import { updateSocietySchema } from '@/lib/validation/society';
import { logAuditEvent } from '@/lib/audit/logger';

// GET /api/admin/settings — Get society settings
export const GET = withAuth(
  async (req, { auth }) => {
    try {
      await dbConnect();

      const society = await Society.findById(auth.societyId);
      if (!society) {
        return NextResponse.json({ error: 'Society not found' }, { status: 404 });
      }

      return NextResponse.json({
        settings: {
          name: society.name,
          address: society.address,
          city: society.city,
          state: society.state,
          pincode: society.pincode,
          lateFeeRule: society.lateFeeRule,
          defaultBillAmount: society.defaultBillAmount,
          maxVisitorWindowHours: society.maxVisitorWindowHours,
          emergencyContacts: society.emergencyContacts,
        },
      });
    } catch (error) {
      console.error('[Admin:Settings] GET error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['admin'] }
);

// PATCH /api/admin/settings — Update society settings
export const PATCH = withAuth(
  async (req, { auth }) => {
    try {
      const body = await req.json();

      // Admins can only update certain fields
      const allowedFields = [
        'lateFeeRule',
        'defaultBillAmount',
        'maxVisitorWindowHours',
        'emergencyContacts',
      ] as const;

      const filteredBody: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          filteredBody[field] = body[field];
        }
      }

      const validation = updateSocietySchema.safeParse(filteredBody);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      await dbConnect();

      const beforeState = await Society.findById(auth.societyId).lean();
      if (!beforeState) {
        return NextResponse.json({ error: 'Society not found' }, { status: 404 });
      }

      const updated = await Society.findByIdAndUpdate(
        auth.societyId,
        { $set: validation.data },
        { new: true, runValidators: true }
      );

      if (!updated) {
        return NextResponse.json({ error: 'Society not found' }, { status: 404 });
      }

      await logAuditEvent({
        action: 'settings.update',
        entityType: 'Society',
        entityId: updated._id,
        beforeState: {
          lateFeeRule: beforeState.lateFeeRule,
          defaultBillAmount: beforeState.defaultBillAmount,
          maxVisitorWindowHours: beforeState.maxVisitorWindowHours,
        },
        afterState: {
          lateFeeRule: updated.lateFeeRule,
          defaultBillAmount: updated.defaultBillAmount,
          maxVisitorWindowHours: updated.maxVisitorWindowHours,
        },
      });

      return NextResponse.json({
        message: 'Settings updated',
        settings: {
          lateFeeRule: updated.lateFeeRule,
          defaultBillAmount: updated.defaultBillAmount,
          maxVisitorWindowHours: updated.maxVisitorWindowHours,
          emergencyContacts: updated.emergencyContacts,
        },
      });
    } catch (error) {
      console.error('[Admin:Settings] PATCH error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['admin'] }
);
