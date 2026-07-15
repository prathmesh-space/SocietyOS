import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Complaint from '@/models/Complaint';
import { withAuth } from '@/lib/auth/middleware';

// GET /api/resident/complaints/[id] — View details of a specific complaint owned by the resident
export const GET = withAuth(
  async (req, { params, auth }) => {
    try {
      await dbConnect();

      // Find the complaint. tenantScopingPlugin scopes to user's societyId.
      const complaint = await Complaint.findById(params.id)
        .populate('assignedAdminId', 'name email')
        .lean();

      if (!complaint) {
        return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
      }

      // Enforce resident ownership (Resident B cannot view Resident A's complaints)
      if (complaint.residentId.toString() !== auth.userId) {
        return NextResponse.json(
          { error: 'Forbidden: You do not own this complaint' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        complaint: {
          ...complaint,
          id: complaint._id.toString(),
        },
      });
    } catch (error) {
      console.error('[Resident:Complaints:Detail] GET error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['resident'] }
);
