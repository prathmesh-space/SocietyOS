import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Unit from '@/models/Unit';
import { withAuth } from '@/lib/auth/middleware';
import { createUnitSchema } from '@/lib/validation/unit';
import { logAuditEvent } from '@/lib/audit/logger';

// GET /api/admin/units — List units in admin's society
export const GET = withAuth(
  async (req, { auth }) => {
    try {
      await dbConnect();

      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const search = url.searchParams.get('search') || '';
      const activeOnly = url.searchParams.get('active') !== 'false';

      const query: Record<string, unknown> = {};
      if (activeOnly) query.active = true;
      const [units, total] = await Promise.all([
        Unit.find(query)
          .populate('primaryResidentId', 'name email phone')
          .sort({ unitNumber: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Unit.countDocuments(query),
      ]);

      const mappedUnits = units.map((u: any) => ({
        ...u,
        id: u._id.toString(),
        squareFeet: u.areaSqFt,
      }));

      return NextResponse.json({
        units: mappedUnits,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error: any) {
      console.error('[Admin:Units] GET error:', error);
      return NextResponse.json({ error: 'Internal server error', details: error.message, stack: error.stack }, { status: 500 });
    }
  },
  { roles: ['admin'] }
);

// POST /api/admin/units — Create a single unit
export const POST = withAuth(
  async (req, { auth }) => {
    try {
      const body = await req.json();
      const validation = createUnitSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const { unitNumber, block, floor, type, areaSqFt, squareFeet } = validation.data;
      const finalAreaSqFt = squareFeet !== undefined ? squareFeet : areaSqFt;

      await dbConnect();

      const unit = await Unit.create({
        unitNumber,
        block,
        floor,
        type,
        areaSqFt: finalAreaSqFt,
        societyId: auth.societyId!,
      });

      await logAuditEvent({
        action: 'unit.create',
        entityType: 'Unit',
        entityId: unit._id,
        afterState: unit.toJSON() as unknown as Record<string, unknown>,
      });

      return NextResponse.json({ unit: unit.toJSON() }, { status: 201 });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        return NextResponse.json(
          { error: 'A unit with this number already exists in your society' },
          { status: 409 }
        );
      }
      console.error('[Admin:Units] POST error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['admin'] }
);
