import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import dbConnect from '@/lib/db/connection';
import User from '@/models/User';
import { loginSchema } from '@/lib/validation/auth';
import { comparePassword, hashToken } from '@/lib/auth/password';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { loginRateLimiter, getRateLimitKey } from '@/lib/auth/rateLimit';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting by IP and email combo
    const body = await req.json();
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Rate limit by IP
    const ipKey = getRateLimitKey(req);
    const ipLimit = loginRateLimiter.check(ipKey);
    if (ipLimit.limited) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((ipLimit.retryAfterMs ?? 0) / 1000)) } }
      );
    }

    // Rate limit by email
    const emailLimit = loginRateLimiter.check(`email:${email}`);
    if (emailLimit.limited) {
      return NextResponse.json(
        { error: 'Too many login attempts for this account. Please try again later.' },
        { status: 429 }
      );
    }

    await dbConnect();

    // Find user — unscoped because we don't have tenant context yet
    // (we need the user record to establish the context)
    const user = await User.findOne({ email })
      .select('+passwordHash +refreshTokenHash +refreshTokenFamily')
      .setOptions({ unscoped: true });

    if (!user) {
      // Generic message — no user enumeration
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check account status
    if (user.status === 'pending') {
      return NextResponse.json(
        { error: 'Your account is pending admin approval' },
        { status: 403 }
      );
    }

    if (user.status === 'deactivated') {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Contact your society admin.' },
        { status: 403 }
      );
    }

    // Generate tokens
    const accessToken = signAccessToken({
      userId: user._id.toString(),
      role: user.role,
      societyId: user.societyId?.toString() ?? null,
    });

    const tokenFamily = uuidv4();
    const refreshToken = signRefreshToken({
      userId: user._id.toString(),
      family: tokenFamily,
    });

    // Store hashed refresh token
    const hashedRefreshToken = await hashToken(refreshToken);
    await User.findByIdAndUpdate(
      user._id,
      {
        refreshTokenHash: hashedRefreshToken,
        refreshTokenFamily: tokenFamily,
      },
      { unscoped: true }
    );

    // Reset rate limit on successful login
    loginRateLimiter.reset(ipKey);
    loginRateLimiter.reset(`email:${email}`);

    return NextResponse.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        societyId: user.societyId,
        unitId: user.unitId,
      },
    });
  } catch (error) {
    console.error('[Login] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
