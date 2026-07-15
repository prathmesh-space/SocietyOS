import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Complaint from '@/models/Complaint';
import { withAuth } from '@/lib/auth/middleware';

// GET /api/admin/complaints — List all complaints in the admin's society (filterable by status)
export const GET = withAuth(
  async (req, { auth }) => {
    try {
      await dbConnect();

      const { searchParams } = new URL(req.url);
      const status = searchParams.get('status');

      const query: Record<string, unknown> = {};
      if (status) {
        query.status = status;
      }

      // Automatically scoped to current admin's societyId via tenantScopingPlugin
      const complaints = await Complaint.find(query)
        .populate('residentId', 'name email phone')
        .populate('unitId', 'unitNumber floor')
        .populate('assignedAdminId', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      const formattedComplaints = complaints.map((c: any) => ({
        ...c,
        id: c._id.toString(),
      }));

      return NextResponse.json({ complaints: formattedComplaints });
    } catch (error) {
      console.error('[Admin:Complaints] GET error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['admin'] }
);
