import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import dbConnect from '@/lib/db/connection';
import User from '@/models/User';
import Society from '@/models/Society';
import Unit from '@/models/Unit';
import { signupSchema } from '@/lib/validation/auth';
import { hashPassword } from '@/lib/auth/password';
import { signupRateLimiter, getRateLimitKey } from '@/lib/auth/rateLimit';
import { runWithTenantContext } from '@/lib/tenant';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(req);
    const rateLimitResult = signupRateLimiter.check(rateLimitKey);
    if (rateLimitResult.limited) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.retryAfterMs ?? 0) / 1000)),
          },
        }
      );
    }

    // Parse and validate body
    const body = await req.json();
    const validation = signupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, name, phone, societyId, unitId } = validation.data;

    await dbConnect();

    // Verify society exists and is active
    const society = await Society.findById(societyId);
    if (!society || !society.active) {
      return NextResponse.json(
        { error: 'Society not found or inactive' },
        { status: 404 }
      );
    }

    // If unitId provided, verify unit exists in this society
    if (unitId) {
      const unit = await Unit.findOne(
        { _id: unitId, societyId: society._id },
        null,
        { unscoped: true }
      );
      if (!unit || !unit.active) {
        return NextResponse.json(
          { error: 'Unit not found or inactive in this society' },
          { status: 404 }
        );
      }
    }

    // Check for duplicate email within society
    const existingUser = await User.findOne(
      { societyId: society._id, email },
      null,
      { unscoped: true }
    );
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists in this society' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user with pending status (awaiting admin approval)
    const user = await User.create({
      email,
      passwordHash,
      role: 'resident',
      societyId: society._id,
      unitId: unitId || null,
      name,
      phone: phone || '',
      status: 'pending', // Resident must be approved by Admin
    });

    return NextResponse.json(
      {
        message: 'Signup successful. Your account is pending admin approval.',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Signup] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
