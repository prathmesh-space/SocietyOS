import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connection';
import Society from '@/models/Society';
import { withAuth } from '@/lib/auth/middleware';
import { preApproveVisitorSchema } from '@/lib/validation/visitor';
import { logAuditEvent } from '@/lib/audit/logger';

// POST /api/resident/visitors/pre-approve — Resident pre-approves a visitor and returns a signed QR token
export const POST = withAuth(
  async (req, { auth }) => {
    try {
      if (!auth.unitId) {
        return NextResponse.json(
          { error: 'User is not assigned to a unit. Cannot pre-approve visitors.' },
          { status: 400 }
        );
      }

      const body = await req.json();
      const validation = preApproveVisitorSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const { visitorName, startWindow, endWindow } = validation.data;

      // Verify that startWindow is before endWindow
      if (startWindow.getTime() >= endWindow.getTime()) {
        return NextResponse.json(
          { error: 'Start window must be before end window' },
          { status: 400 }
        );
      }

      await dbConnect();

      // Fetch society configurations to verify maxVisitorWindowHours
      const society = await Society.findById(auth.societyId).lean();
      if (!society) {
        return NextResponse.json({ error: 'Society not found' }, { status: 404 });
      }

      const maxHours = society.maxVisitorWindowHours || 24;
      const windowDurationHours = (endWindow.getTime() - startWindow.getTime()) / (1000 * 60 * 60);

      if (windowDurationHours > maxHours) {
        return NextResponse.json(
          {
            error: `Requested pre-approval window of ${windowDurationHours.toFixed(1)} hours exceeds society maximum of ${maxHours} hours.`,
          },
          { status: 400 }
        );
      }

      // Generate signed JWT token containing validation claims
      const secret = process.env.JWT_SECRET || 'jwt-secret';
      const token = jwt.sign(
        {
          visitorName,
          unitId: auth.unitId.toString(),
          societyId: auth.societyId!.toString(),
          start: startWindow.toISOString(),
          end: endWindow.toISOString(),
          type: 'visitor_pass',
        },
        secret
      );

      // Log pre-approval audit event
      await logAuditEvent({
        action: 'visitor.pre_approve',
        entityType: 'Visitor',
        entityId: new mongoose.Types.ObjectId(), // Generate stub ID for the pre-approved visitor entry reference
        afterState: {
          visitorName,
          startWindow: startWindow.toISOString(),
          endWindow: endWindow.toISOString(),
          unitId: auth.unitId.toString(),
        },
        actorId: auth.userId,
        societyId: auth.societyId!,
      });

      return NextResponse.json(
        {
          message: 'Visitor pre-approval token generated successfully',
          token,
          visitorName,
          startWindow: startWindow.toISOString(),
          endWindow: endWindow.toISOString(),
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('[Resident:Visitors:PreApprove] POST error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['resident'] }
);
