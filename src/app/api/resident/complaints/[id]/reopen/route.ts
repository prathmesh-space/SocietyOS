import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Complaint from '@/models/Complaint';
import { withAuth } from '@/lib/auth/middleware';
import { logAuditEvent } from '@/lib/audit/logger';

// POST /api/resident/complaints/[id]/reopen — Reopen a Closed complaint by creating a new document
export const POST = withAuth(
  async (req, { params, auth }) => {
    try {
      await dbConnect();

      // Find original complaint
      const originalComplaint = await Complaint.findById(params.id);
      if (!originalComplaint) {
        return NextResponse.json({ error: 'Original complaint not found' }, { status: 404 });
      }

      // Enforce ownership
      if (originalComplaint.residentId.toString() !== auth.userId) {
        return NextResponse.json(
          { error: 'Forbidden: You do not own this complaint' },
          { status: 403 }
        );
      }

      // Verify status is Closed
      if (originalComplaint.status !== 'Closed') {
        return NextResponse.json(
          { error: `Only Closed complaints can be reopened. Current status: ${originalComplaint.status}` },
          { status: 400 }
        );
      }

      // Create a NEW complaint linking to the original Closed complaint
      const newComplaint = await Complaint.create({
        societyId: auth.societyId!,
        unitId: originalComplaint.unitId,
        residentId: auth.userId,
        category: originalComplaint.category,
        title: originalComplaint.title,
        description: `Reopened: ${originalComplaint.description}`,
        status: 'Open',
        reopenedFromId: originalComplaint._id,
      });

      // Log audit event for the new complaint
      await logAuditEvent({
        action: 'complaint.create',
        entityType: 'Complaint',
        entityId: newComplaint._id,
        afterState: {
          category: newComplaint.category,
          status: 'Open',
          reopenedFromId: originalComplaint._id.toString(),
        },
        actorId: auth.userId,
        societyId: auth.societyId!,
      });

      return NextResponse.json(
        {
          message: 'Complaint reopened successfully into a new record',
          complaint: {
            ...newComplaint.toJSON(),
            id: newComplaint._id.toString(),
          },
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('[Resident:Complaints:Reopen] Error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['resident'] }
);
