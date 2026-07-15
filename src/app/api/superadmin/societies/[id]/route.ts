import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Society from '@/models/Society';
import Unit from '@/models/Unit';
import { withAuth } from '@/lib/auth/middleware';
import { updateSocietySchema } from '@/lib/validation/society';
import { logAuditEvent } from '@/lib/audit/logger';

// GET /api/superadmin/societies/[id] — View society details
export const GET = withAuth(
  async (req, { params, auth }) => {
    try {
      await dbConnect();

      const society = await Society.findById(params.id);
      if (!society) {
        return NextResponse.json({ error: 'Society not found' }, { status: 404 });
      }

      // Get aggregate stats (no resident-level data)
      const unitCount = await Unit.countDocuments(
        { societyId: society._id },
        { unscoped: true } as never
      ).setOptions({ unscoped: true });

      return NextResponse.json({
        society: society.toJSON(),
        stats: { unitCount },
      });
    } catch (error) {
      console.error('[SuperAdmin:Society] GET error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  { roles: ['superadmin'] }
);

// PATCH /api/superadmin/societies/[id] — Update / deactivate society
export const PATCH = withAuth(
  async (req, { params, auth }) => {
    try {
      const body = await req.json();
      const validation = updateSocietySchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      await dbConnect();

      const beforeState = await Society.findById(params.id).lean();
      if (!beforeState) {
        return NextResponse.json({ error: 'Society not found' }, { status: 404 });
      }

      if (validation.data.active === true) {
        const contactCount = beforeState.emergencyContacts?.length || 0;
        if (contactCount === 0) {
          return NextResponse.json(
            { error: 'Cannot activate society: At least one emergency contact is required.' },
            { status: 400 }
          );
        }
      }

      const updated = await Society.findByIdAndUpdate(
        params.id,
        { $set: validation.data },
        { new: true, runValidators: true }
      );

      if (!updated) {
        return NextResponse.json({ error: 'Society not found' }, { status: 404 });
      }

      await logAuditEvent({
        action: 'society.update',
        entityType: 'Society',
        entityId: updated._id,
        beforeState: beforeState as unknown as Record<string, unknown>,
        afterState: updated.toJSON() as unknown as Record<string, unknown>,
        actorId: auth.userId,
        societyId: updated._id.toString(),
      });

      return NextResponse.json({ society: updated.toJSON() });
    } catch (error) {
      console.error('[SuperAdmin:Society] PATCH error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  { roles: ['superadmin'] }
);

// DELETE /api/superadmin/societies/[id] — Soft delete (deactivate)
export const DELETE = withAuth(
  async (req, { params, auth }) => {
    try {
      await dbConnect();

      const society = await Society.findById(params.id);
      if (!society) {
        return NextResponse.json({ error: 'Society not found' }, { status: 404 });
      }

      if (!society.active) {
        return NextResponse.json(
          { error: 'Society is already deactivated' },
          { status: 400 }
        );
      }

      // Soft delete
      society.active = false;
      await society.save();

      await logAuditEvent({
        action: 'society.deactivate',
        entityType: 'Society',
        entityId: society._id,
        beforeState: { active: true },
        afterState: { active: false },
        actorId: auth.userId,
        societyId: society._id.toString(),
      });

      return NextResponse.json({
        message: 'Society deactivated successfully',
        society: society.toJSON(),
      });
    } catch (error) {
      console.error('[SuperAdmin:Society] DELETE error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  { roles: ['superadmin'] }
);
