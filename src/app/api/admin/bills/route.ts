import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import MaintenanceBill from '@/models/MaintenanceBill';
import { withAuth } from '@/lib/auth/middleware';

// GET /api/admin/bills — List all bills in the society
export const GET = withAuth(
  async (req, { auth }) => {
    try {
      await dbConnect();
      
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const status = url.searchParams.get('status');

      const query: Record<string, unknown> = {};
      if (status) query.status = status;

      const [bills, total] = await Promise.all([
        MaintenanceBill.find(query)
          .populate('unitId', 'unitNumber block floor')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        MaintenanceBill.countDocuments(query),
      ]);

      return NextResponse.json({
        bills,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('[Admin:Bills] GET error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['admin'] }
);
