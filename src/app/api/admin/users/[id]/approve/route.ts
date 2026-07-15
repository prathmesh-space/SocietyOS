import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import User from '@/models/User';
import Unit from '@/models/Unit';
import { withAuth } from '@/lib/auth/middleware';
import { approveResidentSchema } from '@/lib/validation/user';
import { logAuditEvent } from '@/lib/audit/logger';

// POST /api/admin/users/[id]/approve — Approve or reject a pending resident
export const POST = withAuth(
  async (req, { params, auth }) => {
    try {
      const body = await req.json();
      const validation = approveResidentSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      await dbConnect();

      const user = await User.findById(params.id);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (user.role !== 'resident') {
        return NextResponse.json(
          { error: 'Only resident accounts can be approved' },
          { status: 400 }
        );
      }

      if (user.status !== 'pending') {
        return NextResponse.json(
          { error: `User is already ${user.status}` },
          { status: 400 }
        );
      }

      const { approved } = validation.data;
      const beforeStatus = user.status;

      if (approved) {
        user.status = 'active';

        // If user has a unit, set them as primary resident if none exists
        if (user.unitId) {
          const unit = await Unit.findById(user.unitId);
          if (unit && !unit.primaryResidentId) {
            unit.primaryResidentId = user._id;
            await unit.save();
          }
        }
      } else {
        user.status = 'deactivated';
      }

      await user.save();

      await logAuditEvent({
        action: 'user.approve',
        entityType: 'User',
        entityId: user._id,
        beforeState: { status: beforeStatus },
        afterState: { status: user.status, approved },
      });

      return NextResponse.json({
        message: approved ? 'Resident approved' : 'Resident rejected',
        user: user.toJSON(),
      });
    } catch (error) {
      console.error('[Admin:ApproveUser] Error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['admin'] }
);
