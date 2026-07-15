import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db/connection';
import User from '@/models/User';
import { activateSchema } from '@/lib/validation/auth';
import { hashPassword } from '@/lib/auth/password';
import { logAuditEvent } from '@/lib/audit/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = activateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { token, password } = validation.data;

    await dbConnect();

    // Hash the token to match what's stored in the database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find the user with this token, ensuring it hasn't expired.
    // We must use unscoped query because the user context is not established yet.
    const user = await User.findOne({
      activationToken: hashedToken,
      activationTokenExpires: { $gt: new Date() },
    }).select('+activationToken +activationTokenExpires').setOptions({ unscoped: true });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired activation token' },
        { status: 400 }
      );
    }

    // Set new password
    const passwordHash = await hashPassword(password);
    user.passwordHash = passwordHash;
    user.status = 'active';
    user.activationToken = null;
    user.activationTokenExpires = null;
    await user.save();

    // Log the activation (AuditLog stub)
    await logAuditEvent({
      action: 'user.update',
      entityType: 'User',
      entityId: user._id,
      afterState: { status: 'active' },
      actorId: user._id.toString(),
      societyId: user.societyId ? user.societyId.toString() : undefined,
    });

    return NextResponse.json({
      message: 'Account activated successfully. You can now log in.',
    });
  } catch (error) {
    console.error('[Auth:Activate] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
