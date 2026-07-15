import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import User from '@/models/User';
import { withAuth } from '@/lib/auth/middleware';
import { createWatchmanSchema } from '@/lib/validation/user';
import { hashPassword } from '@/lib/auth/password';
import { logAuditEvent } from '@/lib/audit/logger';

// POST /api/admin/users/watchman — Create a watchman account
export const POST = withAuth(
  async (req, { auth }) => {
    try {
      const body = await req.json();
      const validation = createWatchmanSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const { email, password, name, phone } = validation.data;

      await dbConnect();

      // Check for existing user with same email globally
      const existing = await User.findOne({ email }).setOptions({ unscoped: true });
      if (existing) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        );
      }

      const passwordHash = await hashPassword(password);

      const watchman = await User.create({
        email,
        passwordHash,
        role: 'watchman',
        societyId: auth.societyId!,
        name,
        phone: phone || '',
        status: 'active', // Watchman is immediately active
      });

      await logAuditEvent({
        action: 'user.create',
        entityType: 'User',
        entityId: watchman._id,
        afterState: { email, name, role: 'watchman' },
      });

      return NextResponse.json(
        {
          message: 'Watchman account created',
          user: watchman.toJSON(),
        },
        { status: 201 }
      );
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        );
      }
      console.error('[Admin:CreateWatchman] Error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['admin'] }
);
