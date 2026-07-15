import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import AuditLog from '@/models/AuditLog';
import { withAuth } from '@/lib/auth/middleware';

// GET /api/admin/audit-log — Filterable audit log
export const GET = withAuth(
  async (req, { auth }) => {
    try {
      await dbConnect();

      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
      const entityType = url.searchParams.get('entityType');
      const action = url.searchParams.get('action');
      const actorId = url.searchParams.get('actorId');
      const startDate = url.searchParams.get('startDate');
      const endDate = url.searchParams.get('endDate');

      const query: Record<string, unknown> = {};

      if (entityType) query.entityType = entityType;
      if (action) query.action = action;
      if (actorId) query.actorId = actorId;

      if (startDate || endDate) {
        const dateFilter: Record<string, Date> = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);
        query.timestamp = dateFilter;
      }

      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .populate('actorId', 'name email role')
          .sort({ timestamp: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        AuditLog.countDocuments(query),
      ]);

      return NextResponse.json({
        logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('[Admin:AuditLog] GET error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['admin'] }
);

export const PATCH = async () => {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
};

export const DELETE = async () => {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
};
