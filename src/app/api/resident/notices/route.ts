import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Notice from '@/models/Notice';
import { withAuth } from '@/lib/auth/middleware';

// GET /api/resident/notices — Resident lists active notices (not expired)
export const GET = withAuth(
  async (req, { auth }) => {
    try {
      await dbConnect();

      // Find notices that have not expired or have no expiry date (scoped automatically by tenantScopingPlugin)
      const now = new Date();
      const notices = await Notice.find({
        $or: [
          { expiryDate: null },
          { expiryDate: { $gt: now } },
        ],
      })
        .populate('authorId', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      const formatted = notices.map((n: any) => ({
        ...n,
        id: n._id.toString(),
      }));

      return NextResponse.json({ notices: formatted });
    } catch (error) {
      console.error('[Resident:Notices] GET error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['resident'] }
);
