import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import User from '@/models/User';
import { withAuth } from '@/lib/auth/middleware';

export const POST = withAuth(async (req, { auth }) => {
  try {
    await dbConnect();

    // Revoke the refresh token
    await User.findByIdAndUpdate(
      auth.userId,
      { refreshTokenHash: null, refreshTokenFamily: null },
      { unscoped: true }
    );

    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('[Logout] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
