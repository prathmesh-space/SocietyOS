import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Notice from '@/models/Notice';
import { withAuth } from '@/lib/auth/middleware';
import { createNoticeSchema } from '@/lib/validation/notice';
import { logAuditEvent } from '@/lib/audit/logger';

// GET /api/admin/notices — Admin lists all notices in their society (including expired ones)
export const GET = withAuth(
  async (req, { auth }) => {
    try {
      await dbConnect();

      const notices = await Notice.find({})
        .populate('authorId', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      const formatted = notices.map((n: any) => ({
        ...n,
        id: n._id.toString(),
      }));

      return NextResponse.json({ notices: formatted });
    } catch (error) {
      console.error('[Admin:Notices] GET error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['admin'] }
);

// POST /api/admin/notices — Admin creates a new notice
export const POST = withAuth(
  async (req, { auth }) => {
    try {
      const body = await req.json();
      const validation = createNoticeSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const { title, body: noticeBody, expiryDate } = validation.data;

      await dbConnect();

      const notice = await Notice.create({
        societyId: auth.societyId,
        authorId: auth.userId,
        title,
        body: noticeBody,
        expiryDate: expiryDate || null,
      });

      await logAuditEvent({
        action: 'notice.create',
        entityType: 'Notice',
        entityId: notice._id,
        afterState: {
          title,
          body: noticeBody,
          expiryDate: expiryDate ? expiryDate.toISOString() : null,
        },
        actorId: auth.userId,
        societyId: auth.societyId!,
      });

      return NextResponse.json(
        {
          message: 'Notice posted successfully',
          notice: {
            ...notice.toJSON(),
            id: notice._id.toString(),
          },
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('[Admin:Notices] POST error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['admin'] }
);
