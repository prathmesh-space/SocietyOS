import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Visitor from '@/models/Visitor';
import { withAuth } from '@/lib/auth/middleware';

// GET /api/watchman/visitors/inside — View all visitors currently inside the society (exitTime is null)
export const GET = withAuth(
  async (req, { auth }) => {
    try {
      await dbConnect();

      // Find visitors that entered and have not exited (automatically scoped to current societyId)
      const visitors = await Visitor.find({
        entryTime: { $ne: null },
        exitTime: null,
      })
        .populate('unitId', 'unitNumber floor')
        .sort({ entryTime: -1 })
        .lean();

      // Format results to include string id
      const formatted = visitors.map((v: any) => ({
        ...v,
        id: v._id.toString(),
      }));

      return NextResponse.json({ visitors: formatted });
    } catch (error) {
      console.error('[Watchman:Visitors:Inside] GET error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['watchman', 'admin'] }
);
