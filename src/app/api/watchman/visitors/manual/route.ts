import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connection';
import Unit from '@/models/Unit';
import Visitor from '@/models/Visitor';
import { withAuth } from '@/lib/auth/middleware';
import { manualVisitorEntrySchema } from '@/lib/validation/visitor';
import { logAuditEvent } from '@/lib/audit/logger';

// POST /api/watchman/visitors/manual — Log an unscheduled visitor directly
export const POST = withAuth(
  async (req, { auth }) => {
    try {
      const body = await req.json();
      const validation = manualVisitorEntrySchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const { visitorName, unitId, entryTime } = validation.data;

      await dbConnect();

      // Find the unit. Scoping plugin scopes to watchman's societyId.
      const unit = await Unit.findById(unitId);
      if (!unit) {
        return NextResponse.json(
          { error: 'Unit not found or does not belong to your society' },
          { status: 404 }
        );
      }

      // Create unverified visitor check-in
      const visitor = await Visitor.create({
        societyId: auth.societyId!,
        unitId: unit._id,
        visitorName,
        entryTime: entryTime || new Date(),
        preApproved: false,
        verifiedAt: null,
        verificationStatus: 'unverified',
        token: undefined,
      });

      // Log manual entry in AuditLog
      await logAuditEvent({
        action: 'visitor.manual_entry',
        entityType: 'Visitor',
        entityId: visitor._id,
        afterState: {
          visitorName,
          unitId,
          preApproved: false,
          verificationStatus: 'unverified',
        },
        actorId: auth.userId,
        societyId: auth.societyId!,
      });

      return NextResponse.json(
        {
          message: 'Visitor logged successfully',
          visitor,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('[Watchman:Visitors:Manual] POST error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['watchman'] }
);
