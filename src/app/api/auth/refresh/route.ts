export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import dbConnect from '@/lib/db/connection';
import User from '@/models/User';
import { refreshSchema } from '@/lib/validation/auth';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { hashToken, compareToken } from '@/lib/auth/password';
import { refreshRateLimiter, getRateLimitKey } from '@/lib/auth/rateLimit';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(req);
    const rateLimitResult = refreshRateLimiter.check(rateLimitKey);
    if (rateLimitResult.limited) {
      return NextResponse.json(
        { error: 'Too many refresh attempts' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validation = refreshSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    const { refreshToken } = validation.data;

    // Verify the refresh token JWT
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Find the user
    const user = await User.findById(payload.userId)
      .select('+refreshTokenHash +refreshTokenFamily +passwordHash')
      .setOptions({ unscoped: true });

    if (!user || user.status !== 'active') {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401 }
      );
    }

    // --- Token Rotation & Reuse Detection ---
    // If the token family doesn't match, this is a reuse of a rotated-out token.
    // This is a security event: revoke the entire token family.
    if (user.refreshTokenFamily !== payload.family) {
      // Potential token theft — revoke all refresh tokens for this user
      await User.findByIdAndUpdate(
        user._id,
        { refreshTokenHash: null, refreshTokenFamily: null },
        { unscoped: true }
      );
      console.warn(
        `[Auth] Refresh token reuse detected for user ${user._id}. All tokens revoked.`
      );
      return NextResponse.json(
        { error: 'Token reuse detected. All sessions have been revoked.' },
        { status: 401 }
      );
    }

    // Verify the hashed refresh token matches
    if (!user.refreshTokenHash) {
      return NextResponse.json(
        { error: 'No active refresh token' },
        { status: 401 }
      );
    }

    const isTokenValid = await compareToken(refreshToken, user.refreshTokenHash);
    if (!isTokenValid) {
      // Token doesn't match — could be reuse after rotation
      await User.findByIdAndUpdate(
        user._id,
        { refreshTokenHash: null, refreshTokenFamily: null },
        { unscoped: true }
      );
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // --- Issue new tokens ---
    const newAccessToken = signAccessToken({
      userId: user._id.toString(),
      role: user.role,
      societyId: user.societyId?.toString() ?? null,
      unitId: user.unitId?.toString() ?? null,
    });

    // Rotate refresh token: same family, new token
    const newRefreshToken = signRefreshToken({
      userId: user._id.toString(),
      family: payload.family, // Keep the same family
    });

    // Store the new hashed refresh token
    const hashedNewRefreshToken = await hashToken(newRefreshToken);
    await User.findByIdAndUpdate(
      user._id,
      { refreshTokenHash: hashedNewRefreshToken },
      { unscoped: true }
    );

    return NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('[Refresh] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
