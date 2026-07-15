import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Society from '@/models/Society';
import User from '@/models/User';
import { withAuth } from '@/lib/auth/middleware';
import { createSocietySchema } from '@/lib/validation/society';
import { hashPassword } from '@/lib/auth/password';
import { logAuditEvent } from '@/lib/audit/logger';

// GET /api/superadmin/societies — List all societies
export const GET = withAuth(
  async (req, { auth }) => {
    try {
      await dbConnect();

      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      const search = url.searchParams.get('search') || '';

      const query: Record<string, unknown> = {};
      if (search) {
        query.name = { $regex: search, $options: 'i' };
      }

      const [societies, total] = await Promise.all([
        Society.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Society.countDocuments(query),
      ]);

      return NextResponse.json({
        societies,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('[SuperAdmin:Societies] GET error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  { roles: ['superadmin'] }
);

// POST /api/superadmin/societies — Create a new society + first admin user (with activation token)
import crypto from 'crypto';

export const POST = withAuth(
  async (req, { auth }) => {
    try {
      const body = await req.json();
      const validation = createSocietySchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const {
        adminEmail,
        adminName,
        lateFeeRule,
        ...societyData
      } = validation.data;

      await dbConnect();

      // Create society
      const society = await Society.create({
        ...societyData,
        lateFeeRule: lateFeeRule || { type: 'percentage', value: 2, gracePeriodDays: 7 },
      });

      // Generate activation token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry

      // Set a temporary random password hash since it is a required field
      const tempPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await hashPassword(tempPassword);

      // Create first admin user for this society (status: pending, awaiting activation)
      const adminUser = await User.create({
        email: adminEmail,
        passwordHash,
        role: 'admin',
        societyId: society._id,
        name: adminName,
        phone: '',
        status: 'pending', // Awaiting activation
        activationToken: hashedToken,
        activationTokenExpires: tokenExpiry,
      });

      // Log the creation (AuditLog stub)
      await logAuditEvent({
        action: 'society.create',
        entityType: 'Society',
        entityId: society._id,
        afterState: society.toJSON(),
        actorId: auth.userId,
        societyId: society._id.toString(),
      });

      return NextResponse.json(
        {
          society: society.toJSON(),
          admin: {
            id: adminUser._id,
            email: adminUser.email,
            name: adminUser.name,
            role: adminUser.role,
            status: adminUser.status,
          },
          activationToken: rawToken,
          activationLink: `/activate?token=${rawToken}`,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('[SuperAdmin:Societies] POST error:', error);

      // Handle duplicate key errors
      if ((error as { code?: number }).code === 11000) {
        return NextResponse.json(
          { error: 'An admin with this email already exists in a society' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  { roles: ['superadmin'] }
);
