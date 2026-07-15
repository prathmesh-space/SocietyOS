import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import User from '@/models/User';
import Unit from '@/models/Unit';
import { withAuth } from '@/lib/auth/middleware';

// GET /api/admin/users — List users in admin's society
export const GET = withAuth(
  async (req, { auth }) => {
    try {
      await dbConnect();

      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const status = url.searchParams.get('status'); // pending, active, deactivated
      const role = url.searchParams.get('role'); // resident, watchman, admin

      const query: Record<string, unknown> = {};
      if (status) query.status = status;
      if (role) query.role = role;

      const [users, total] = await Promise.all([
        User.find(query)
          .populate('unitId', 'unitNumber floor type')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        User.countDocuments(query),
      ]);

      return NextResponse.json({
        users,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('[Admin:Users] GET error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['admin'] }
);
