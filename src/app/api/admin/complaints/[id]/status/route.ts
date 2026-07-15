import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Complaint from '@/models/Complaint';
import { withAuth } from '@/lib/auth/middleware';
import { updateComplaintStatusSchema } from '@/lib/validation/complaint';
import { logAuditEvent } from '@/lib/audit/logger';

// PATCH /api/admin/complaints/[id]/status — Update status of a complaint following the linear status pipeline
export const PATCH = withAuth(
  async (req, { params, auth }) => {
    try {
      const body = await req.json();
      const validation = updateComplaintStatusSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const { status: targetStatus, resolutionNote } = validation.data;

      await dbConnect();

      // Find complaint (scoped to societyId)
      const complaint = await Complaint.findById(params.id);
      if (!complaint) {
        return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
      }

      const currentStatus = complaint.status;

      // Check if target status is identical to current
      if (currentStatus === targetStatus) {
        return NextResponse.json(
          { error: `Complaint is already in ${targetStatus} status` },
          { status: 400 }
        );
      }

      // Enforce status pipeline transition (linear: Open -> In Progress -> Resolved -> Closed)
      const isValid =
        (currentStatus === 'Open' && targetStatus === 'In Progress') ||
        (currentStatus === 'In Progress' && targetStatus === 'Resolved') ||
        (currentStatus === 'Resolved' && targetStatus === 'Closed');

      if (!isValid) {
        return NextResponse.json(
          {
            error: `Invalid status transition: Cannot move complaint directly from ${currentStatus} to ${targetStatus}`,
          },
          { status: 400 }
        );
      }

      // A resolutionNote is strictly required before moving to Resolved
      if (targetStatus === 'Resolved') {
        if (!resolutionNote || resolutionNote.trim() === '') {
          return NextResponse.json(
            { error: 'A resolution note is required to resolve a complaint' },
            { status: 400 }
          );
        }
        complaint.resolutionNote = resolutionNote;
      }

      // If closed, we can optionally update/append the resolutionNote if supplied
      if (targetStatus === 'Closed' && resolutionNote) {
        complaint.resolutionNote = resolutionNote;
      }

      complaint.status = targetStatus;
      await complaint.save();

      // Determine audit action type
      let auditAction: 'complaint.update' | 'complaint.resolve' | 'complaint.close' = 'complaint.update';
      if (targetStatus === 'Resolved') {
        auditAction = 'complaint.resolve';
      } else if (targetStatus === 'Closed') {
        auditAction = 'complaint.close';
      }

      // Log status change
      await logAuditEvent({
        action: auditAction,
        entityType: 'Complaint',
        entityId: complaint._id,
        beforeState: { status: currentStatus },
        afterState: { status: targetStatus, resolutionNote: complaint.resolutionNote },
        actorId: auth.userId,
        societyId: auth.societyId!,
      });

      return NextResponse.json({
        message: `Complaint status updated to ${targetStatus}`,
        complaint,
      });
    } catch (error) {
      console.error('[Admin:Complaints:Status] PATCH error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['admin'] }
);
