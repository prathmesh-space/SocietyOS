import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env.local') });

import { POST as onboardingHandler } from '@/app/api/superadmin/societies/route';
import { POST as activationHandler } from '@/app/api/auth/activate/route';
import Society from '@/models/Society';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { signAccessToken } from '@/lib/auth/jwt';
import { comparePassword } from '@/lib/auth/password';

let superAdminToken: string;
let adminToken: string;
let residentToken: string;
const dummySuperAdminId = new mongoose.Types.ObjectId().toString();
const dummyAdminId = new mongoose.Types.ObjectId().toString();
const dummyResidentId = new mongoose.Types.ObjectId().toString();
const dummySocietyId = new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not set in .env.local');
  }
  await mongoose.connect(mongoUri);

  // Generate tokens for testing auth roles
  superAdminToken = signAccessToken({
    userId: dummySuperAdminId,
    role: 'superadmin',
    societyId: null,
  });

  adminToken = signAccessToken({
    userId: dummyAdminId,
    role: 'admin',
    societyId: dummySocietyId,
  });

  residentToken = signAccessToken({
    userId: dummyResidentId,
    role: 'resident',
    societyId: dummySocietyId,
  });
});

afterAll(async () => {
  // Cleanup test data
  const testSocieties = await Society.find({ name: 'SuperAdmin Onboarding CHS' }).lean();
  const testSocietyIds = testSocieties.map(s => s._id);

  if (testSocietyIds.length > 0) {
    await User.deleteMany({ societyId: { $in: testSocietyIds } }).setOptions({ unscoped: true });
    await mongoose.connection.collection('auditlogs').deleteMany({
      societyId: { $in: testSocietyIds },
    });
    await Society.deleteMany({ _id: { $in: testSocietyIds } });
  }

  await mongoose.disconnect();
});

describe('Super Admin Onboarding & Activation Flow', () => {
  let activationToken: string;

  test('Happy Path: Super Admin can onboard a society and its first admin', async () => {
    const payload = {
      name: 'SuperAdmin Onboarding CHS',
      address: '123 Onboarding Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400088',
      adminEmail: 'admin-onboard@test.societyos.in',
      adminName: 'Onboarded Admin',
    };

    const req = new NextRequest('http://localhost/api/superadmin/societies', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify(payload),
    });

    const res = await onboardingHandler(req, {} as any);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.society.name).toBe(payload.name);
    expect(body.admin.email).toBe(payload.adminEmail);
    expect(body.admin.status).toBe('pending');
    expect(body.activationToken).toBeDefined();
    expect(body.activationLink).toContain(body.activationToken);

    activationToken = body.activationToken;

    // Verify AuditLog was written
    const logs = await AuditLog.find({
      societyId: body.society._id,
      action: 'society.create',
    }).lean().setOptions({ unscoped: true });
    expect(logs.length).toBe(1);
    expect(logs[0]!.actorId.toString()).toBe(dummySuperAdminId);
  });

  test('Authorization Failure: Admin / Resident cannot onboard a society', async () => {
    const payload = {
      name: 'Unauthorized Onboarding CHS',
      address: '123 Onboarding Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400088',
      adminEmail: 'admin-unauth@test.societyos.in',
      adminName: 'Unauth Admin',
    };

    // Try as Admin
    const reqAdmin = new NextRequest('http://localhost/api/superadmin/societies', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify(payload),
    });

    const resAdmin = await onboardingHandler(reqAdmin, {} as any);
    expect(resAdmin.status).toBe(403);

    // Try as Resident
    const reqRes = new NextRequest('http://localhost/api/superadmin/societies', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${residentToken}`,
      },
      body: JSON.stringify(payload),
    });

    const resRes = await onboardingHandler(reqRes, {} as any);
    expect(resRes.status).toBe(403);
  });

  test('Happy Path: Onboarded admin can activate their account', async () => {
    expect(activationToken).toBeDefined();

    const payload = {
      token: activationToken,
      password: 'ActivatedAdmin@123!',
    };

    const req = new NextRequest('http://localhost/api/auth/activate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const res = await activationHandler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.message).toContain('activated successfully');

    // Retrieve user and check status is active and passwordHash is set and verified
    const user = await User.findOne({ email: 'admin-onboard@test.societyos.in' })
      .select('+passwordHash +activationToken +activationTokenExpires')
      .setOptions({ unscoped: true });

    expect(user).not.toBeNull();
    expect(user!.status).toBe('active');
    expect(user!.activationToken).toBeNull();
    expect(user!.activationTokenExpires).toBeNull();

    const isMatch = await comparePassword(payload.password, user!.passwordHash);
    expect(isMatch).toBe(true);

    // Verify AuditLog was written
    const logs = await AuditLog.find({
      actorId: user!._id,
      action: 'user.update',
    }).lean().setOptions({ unscoped: true });
    expect(logs.length).toBe(1);
  });

  test('Activation Failure: Invalid / Expired token returns 400', async () => {
    const payload = {
      token: 'invalidtoken12345',
      password: 'NewPassword@123!',
    };

    const req = new NextRequest('http://localhost/api/auth/activate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const res = await activationHandler(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('Invalid or expired activation token');
  });
});
