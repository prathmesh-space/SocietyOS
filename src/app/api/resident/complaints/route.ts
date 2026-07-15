import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Complaint from '@/models/Complaint';
import { withAuth } from '@/lib/auth/middleware';
import { createComplaintSchema } from '@/lib/validation/complaint';
import { logAuditEvent } from '@/lib/audit/logger';

// GET /api/resident/complaints — List resident's own complaints
export const GET = withAuth(
  async (req, { auth }) => {
    try {
      await dbConnect();

      // Find complaints raised by this resident (automatically scoped by tenantScopingPlugin)
      const complaints = await Complaint.find({ residentId: auth.userId })
        .populate('assignedAdminId', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      const formattedComplaints = complaints.map((c: any) => ({
        ...c,
        id: c._id.toString(),
      }));

      return NextResponse.json({ complaints: formattedComplaints });
    } catch (error) {
      console.error('[Resident:Complaints] GET error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['resident'] }
);

// POST /api/resident/complaints — File a new complaint for resident's assigned unit
export const POST = withAuth(
  async (req, { auth }) => {
    try {
      if (!auth.unitId) {
        return NextResponse.json(
          { error: 'User is not assigned to a unit. Cannot file complaints.' },
          { status: 400 }
        );
      }

      const body = await req.json();
      const validation = createComplaintSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const { category, description } = validation.data;

      await dbConnect();

      // Create complaint record
      const complaint = await Complaint.create({
        societyId: auth.societyId,
        unitId: auth.unitId,
        residentId: auth.userId,
        category,
        description,
        status: 'Open',
      });

      // Audit Log for Complaint Creation
      await logAuditEvent({
        action: 'complaint.create',
        entityType: 'Complaint',
        entityId: complaint._id,
        afterState: {
          category,
          description,
          status: 'Open',
          unitId: auth.unitId.toString(),
        },
        actorId: auth.userId,
        societyId: auth.societyId!,
      });

      return NextResponse.json(
        {
          message: 'Complaint filed successfully',
          complaint,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('[Resident:Complaints] POST error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['resident'] }
);
