import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connection';
import Complaint from '@/models/Complaint';
import User from '@/models/User';
import { withAuth } from '@/lib/auth/middleware';
import { assignComplaintSchema } from '@/lib/validation/complaint';
import { logAuditEvent } from '@/lib/audit/logger';

// PATCH /api/admin/complaints/[id]/assign — Assign a complaint to an admin
export const PATCH = withAuth(
  async (req, { params, auth }) => {
    try {
      const body = await req.json();
      const validation = assignComplaintSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const { assignedAdminId } = validation.data;

      await dbConnect();

      // Find the complaint (scoped to societyId)
      const complaint = await Complaint.findById(params.id);
      if (!complaint) {
        return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
      }

      let assignedAdminName = 'Unassigned';

      if (assignedAdminId) {
        // Find user to assign (implicitly scoped by tenant context, ensures same society)
        const adminUser = await User.findById(assignedAdminId);
        if (!adminUser) {
          return NextResponse.json(
            { error: 'Admin user not found or not in your society' },
            { status: 404 }
          );
        }

        if (adminUser.role !== 'admin') {
          return NextResponse.json(
            { error: 'Complaints can only be assigned to Admin accounts' },
            { status: 400 }
          );
        }

        assignedAdminName = adminUser.name;
      }

      const beforeAdminId = complaint.assignedAdminId;

      complaint.assignedAdminId = assignedAdminId ? new mongoose.Types.ObjectId(assignedAdminId) : null;
      await complaint.save();

      // Log assignment change
      await logAuditEvent({
        action: 'complaint.assign',
        entityType: 'Complaint',
        entityId: complaint._id,
        beforeState: { assignedAdminId: beforeAdminId?.toString() || null },
        afterState: { assignedAdminId: assignedAdminId || null, assignedAdminName },
        actorId: auth.userId,
        societyId: auth.societyId!,
      });

      return NextResponse.json({
        message: `Complaint successfully ${assignedAdminId ? 'assigned to ' + assignedAdminName : 'unassigned'}`,
        complaint,
      });
    } catch (error) {
      console.error('[Admin:Complaints:Assign] PATCH error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['admin'] }
);
