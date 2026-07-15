import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Unit from '@/models/Unit';
import { withAuth } from '@/lib/auth/middleware';
import { updateUnitSchema } from '@/lib/validation/unit';
import { logAuditEvent } from '@/lib/audit/logger';

// GET /api/admin/units/[id]
export const GET = withAuth(
  async (req, { params }) => {
    try {
      await dbConnect();

      const unit = await Unit.findById(params.id)
        .populate('primaryResidentId', 'name email phone');

      if (!unit) {
        return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
      }

      return NextResponse.json({ unit: unit.toJSON() });
    } catch (error) {
      console.error('[Admin:Unit] GET error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['admin'] }
);

// PATCH /api/admin/units/[id]
export const PATCH = withAuth(
  async (req, { params, auth }) => {
    try {
      const body = await req.json();
      const validation = updateUnitSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      await dbConnect();

      const beforeState = await Unit.findById(params.id).lean();
      if (!beforeState) {
        return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
      }

      const updated = await Unit.findByIdAndUpdate(
        params.id,
        { $set: validation.data },
        { new: true, runValidators: true }
      );

      if (!updated) {
        return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
      }

      await logAuditEvent({
        action: 'unit.update',
        entityType: 'Unit',
        entityId: updated._id,
        beforeState: beforeState as unknown as Record<string, unknown>,
        afterState: updated.toJSON() as unknown as Record<string, unknown>,
      });

      return NextResponse.json({ unit: updated.toJSON() });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        return NextResponse.json(
          { error: 'A unit with this number already exists' },
          { status: 409 }
        );
      }
      console.error('[Admin:Unit] PATCH error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['admin'] }
);

// DELETE /api/admin/units/[id] — Deactivate (soft delete)
export const DELETE = withAuth(
  async (req, { params, auth }) => {
    try {
      await dbConnect();

      const unit = await Unit.findById(params.id);
      if (!unit) {
        return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
      }

      unit.active = false;
      await unit.save();

      await logAuditEvent({
        action: 'unit.delete',
        entityType: 'Unit',
        entityId: unit._id,
        beforeState: { active: true },
        afterState: { active: false },
      });

      return NextResponse.json({ message: 'Unit deactivated', unit: unit.toJSON() });
    } catch (error) {
      console.error('[Admin:Unit] DELETE error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['admin'] }
);
