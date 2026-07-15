import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env.local') });

import { GET as getSettingsHandler, PATCH as updateSettingsHandler } from '@/app/api/admin/settings/route';
import Society from '@/models/Society';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { signAccessToken } from '@/lib/auth/jwt';

let societyA: any;
let societyB: any;
let adminAToken: string;
let adminBToken: string;
let residentAToken: string;

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not set in .env.local');
  }
  await mongoose.connect(mongoUri);

  await cleanupTestData();

  // Create two societies
  societyA = await Society.create({
    name: 'Settings Test Society A',
    address: 'Address A',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    active: true,
    emergencyContacts: [{ name: 'Test', phone: '1234567890', role: 'Security' }],
    defaultBillAmount: 4000,
    maxVisitorWindowHours: 24,
  });

  societyB = await Society.create({
    name: 'Settings Test Society B',
    address: 'Address B',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400002',
    active: true,
    emergencyContacts: [{ name: 'Test', phone: '1234567890', role: 'Security' }],
    defaultBillAmount: 5000,
    maxVisitorWindowHours: 12,
  });

  // Create users
  const adminA = await User.create({
    email: 'admin-a-settings@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'admin',
    societyId: societyA._id,
    name: 'Admin A',
    status: 'active',
  });

  const adminB = await User.create({
    email: 'admin-b-settings@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'admin',
    societyId: societyB._id,
    name: 'Admin B',
    status: 'active',
  });

  const residentA = await User.create({
    email: 'resident-a-settings@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'resident',
    societyId: societyA._id,
    name: 'Resident A',
    status: 'active',
  });

  adminAToken = signAccessToken({
    userId: adminA._id.toString(),
    role: 'admin',
    societyId: societyA._id.toString(),
  });

  adminBToken = signAccessToken({
    userId: adminB._id.toString(),
    role: 'admin',
    societyId: societyB._id.toString(),
  });

  residentAToken = signAccessToken({
    userId: residentA._id.toString(),
    role: 'resident',
    societyId: societyA._id.toString(),
  });
});

afterAll(async () => {
  await cleanupTestData();
  await mongoose.disconnect();
});

async function cleanupTestData() {
  const testSocieties = await Society.find({
    name: { $in: ['Settings Test Society A', 'Settings Test Society B'] },
  }).lean();
  const testSocietyIds = testSocieties.map(s => s._id);

  if (testSocietyIds.length > 0) {
    await User.deleteMany({ societyId: { $in: testSocietyIds } }).setOptions({ unscoped: true });
    await mongoose.connection.collection('auditlogs').deleteMany({
      societyId: { $in: testSocietyIds },
    });
    await Society.deleteMany({ _id: { $in: testSocietyIds } });
  }
}

describe('Admin Settings API', () => {
  test('Happy Path: Admin A can get and update society settings', async () => {
    // 1. GET settings
    const getReq = new NextRequest('http://localhost/api/admin/settings', {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${adminAToken}`,
      },
    });

    const getRes = await getSettingsHandler(getReq, {} as any);
    expect(getRes.status).toBe(200);

    const getBody = await getRes.json();
    expect(getBody.settings.defaultBillAmount).toBe(4000);

    // 2. PATCH settings
    const patchPayload = {
      defaultBillAmount: 5500,
      maxVisitorWindowHours: 48,
      lateFeeRule: {
        type: 'percentage',
        value: 5,
        gracePeriodDays: 10,
      },
    };

    const patchReq = new NextRequest('http://localhost/api/admin/settings', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminAToken}`,
      },
      body: JSON.stringify(patchPayload),
    });

    const patchRes = await updateSettingsHandler(patchReq, {} as any);
    expect(patchRes.status).toBe(200);

    const patchBody = await patchRes.json();
    expect(patchBody.settings.defaultBillAmount).toBe(patchPayload.defaultBillAmount);
    expect(patchBody.settings.maxVisitorWindowHours).toBe(patchPayload.maxVisitorWindowHours);
    expect(patchBody.settings.lateFeeRule.value).toBe(patchPayload.lateFeeRule.value);

    // Verify AuditLog was written
    const logs = await AuditLog.find({
      societyId: societyA._id,
      action: 'settings.update',
    }).lean().setOptions({ unscoped: true });
    expect(logs.length).toBe(1);
  });

  test('Authorization Failure: Resident cannot view or modify settings', async () => {
    // 1. GET settings
    const getReq = new NextRequest('http://localhost/api/admin/settings', {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${residentAToken}`,
      },
    });
    const getRes = await getSettingsHandler(getReq, {} as any);
    expect(getRes.status).toBe(403);

    // 2. PATCH settings
    const patchReq = new NextRequest('http://localhost/api/admin/settings', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${residentAToken}`,
      },
      body: JSON.stringify({ defaultBillAmount: 9000 }),
    });
    const patchRes = await updateSettingsHandler(patchReq, {} as any);
    expect(patchRes.status).toBe(403);
  });

  test('Tenant Scoping: Admin A modifications do not affect Society B settings', async () => {
    // Verify Society B settings initially
    const getReqB = new NextRequest('http://localhost/api/admin/settings', {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${adminBToken}`,
      },
    });
    const getResB = await getSettingsHandler(getReqB, {} as any);
    const getBodyB = await getResB.json();
    expect(getBodyB.settings.defaultBillAmount).toBe(5000);
    expect(getBodyB.settings.maxVisitorWindowHours).toBe(12);
  });
});
