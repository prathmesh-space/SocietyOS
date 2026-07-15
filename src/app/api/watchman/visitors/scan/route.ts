import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connection';
import Unit from '@/models/Unit';
import Visitor from '@/models/Visitor';
import { withAuth } from '@/lib/auth/middleware';
import { logAuditEvent } from '@/lib/audit/logger';

// POST /api/watchman/visitors/scan — Watchman validates a signed QR pre-approval token and checks in guest
export const POST = withAuth(
  async (req, { auth }) => {
    try {
      const body = await req.json();
      const { token } = body;

      if (!token) {
        return NextResponse.json({ error: 'Token is required', code: 'missing-token' }, { status: 400 });
      }

      await dbConnect();

      let decoded: any;
      try {
        const secret = process.env.JWT_SECRET || 'jwt-secret';
        decoded = jwt.verify(token, secret);
      } catch (err) {
        return NextResponse.json(
          { error: 'Invalid token signature', code: 'invalid-signature' },
          { status: 400 }
        );
      }

      const { visitorName, unitId, societyId, start, end } = decoded;

      // 1. Wrong Society check
      if (societyId !== auth.societyId) {
        return NextResponse.json(
          { error: 'Token belongs to a different society', code: 'wrong-society' },
          { status: 400 }
        );
      }

      // 2. Wrong Unit check
      const unit = await Unit.findById(unitId);
      if (!unit || unit.societyId.toString() !== auth.societyId) {
        return NextResponse.json(
          { error: 'Unit not found or does not belong to this society', code: 'wrong-unit' },
          { status: 400 }
        );
      }

      // 3. Expiry and Window validation with clock-skew tolerance (60 seconds)
      const CLOCK_SKEW_MS = 60 * 1000;
      const nowTime = Date.now();
      const startTime = new Date(start).getTime();
      const endTime = new Date(end).getTime();

      if (nowTime < startTime - CLOCK_SKEW_MS) {
        return NextResponse.json(
          { error: 'Pre-approval window has not started yet', code: 'not-active-yet' },
          { status: 400 }
        );
      }

      if (nowTime > endTime + CLOCK_SKEW_MS) {
        return NextResponse.json(
          { error: 'Pre-approval window has expired', code: 'expired' },
          { status: 400 }
        );
      }

      // 4. Single-use token verification
      const existingScan = await Visitor.findOne({ token }).setOptions({ unscoped: true });
      if (existingScan) {
        return NextResponse.json(
          { error: 'Pre-approval token has already been used', code: 'already-used' },
          { status: 400 }
        );
      }

      // Valid case: Create Visitor check-in record
      let visitor;
      try {
        visitor = await Visitor.create({
          societyId: auth.societyId!,
          unitId: new mongoose.Types.ObjectId(unitId),
          visitorName,
          entryTime: new Date(),
          preApproved: true,
          verifiedAt: new Date(),
          verificationStatus: 'verified',
          token,
        });
      } catch (err: any) {
        if (err.code === 11000 || err.message?.includes('E11000')) {
          return NextResponse.json(
            { error: 'Pre-approval token has already been used (duplicate scan rejected)', code: 'already-used' },
            { status: 400 }
          );
        }
        throw err;
      }

      // Log manual/preapproved entry in AuditLog
      await logAuditEvent({
        action: 'visitor.manual_entry',
        entityType: 'Visitor',
        entityId: visitor._id,
        afterState: {
          visitorName,
          unitId,
          preApproved: true,
          verificationStatus: 'verified',
        },
        actorId: auth.userId,
        societyId: auth.societyId!,
      });

      return NextResponse.json(
        {
          message: 'Visitor entry verified and checked in successfully',
          visitor,
          code: 'verified',
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('[Watchman:Visitors:Scan] Error verifying scan:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['watchman'] }
);
