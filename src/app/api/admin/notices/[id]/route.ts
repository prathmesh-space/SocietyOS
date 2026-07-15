import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Notice from '@/models/Notice';
import { withAuth } from '@/lib/auth/middleware';
import { updateNoticeSchema } from '@/lib/validation/notice';
import { logAuditEvent } from '@/lib/audit/logger';

// PATCH /api/admin/notices/[id] — Admin edits notice (sets lastEditedAt)
export const PATCH = withAuth(
  async (req, { params, auth }) => {
    try {
      const body = await req.json();
      const validation = updateNoticeSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      await dbConnect();

      const beforeState = await Notice.findById(params.id).lean();
      if (!beforeState) {
        return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
      }

      const updated = await Notice.findByIdAndUpdate(
        params.id,
        {
          $set: {
            ...validation.data,
            lastEditedAt: new Date(),
          },
        },
        { new: true, runValidators: true }
      );

      if (!updated) {
        return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
      }

      await logAuditEvent({
        action: 'notice.update',
        entityType: 'Notice',
        entityId: updated._id,
        beforeState: beforeState as any,
        afterState: updated.toJSON() as any,
        actorId: auth.userId,
        societyId: auth.societyId!,
      });

      return NextResponse.json({
        message: 'Notice updated successfully',
        notice: {
          ...updated.toJSON(),
          id: updated._id.toString(),
        },
      });
    } catch (error) {
      console.error('[Admin:NoticeDetail] PATCH error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['admin'] }
);

// DELETE /api/admin/notices/[id] — Admin deletes notice
export const DELETE = withAuth(
  async (req, { params, auth }) => {
    try {
      await dbConnect();

      const notice = await Notice.findById(params.id);
      if (!notice) {
        return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
      }

      await Notice.findByIdAndDelete(params.id);

      await logAuditEvent({
        action: 'notice.delete',
        entityType: 'Notice',
        entityId: notice._id,
        beforeState: notice.toJSON() as any,
        actorId: auth.userId,
        societyId: auth.societyId!,
      });

      return NextResponse.json({ message: 'Notice deleted successfully' });
    } catch (error) {
      console.error('[Admin:NoticeDetail] DELETE error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['admin'] }
);
