import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import MaintenanceBill from '@/models/MaintenanceBill';
import { withAuth } from '@/lib/auth/middleware';

// GET /api/resident/bills — List resident's bills
export const GET = withAuth(
  async (req, { auth }) => {
    try {
      await dbConnect();

      // Only fetch bills belonging to the resident's unit
      const bills = await MaintenanceBill.find({ unitId: auth.unitId })
        .populate('unitId', 'unitNumber block')
        .sort({ createdAt: -1 })
        .lean();

      return NextResponse.json({ bills });
    } catch (error) {
      console.error('[Resident:Bills] GET error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['resident'] }
);
