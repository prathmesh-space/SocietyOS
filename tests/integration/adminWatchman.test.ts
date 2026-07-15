import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env.local') });

import { POST as createWatchmanHandler } from '@/app/api/admin/users/watchman/route';
import { GET as listUsersHandler } from '@/app/api/admin/users/route';
import Society from '@/models/Society';
import Unit from '@/models/Unit';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { signAccessToken } from '@/lib/auth/jwt';
import { comparePassword } from '@/lib/auth/password';

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

  // Force Mongoose model registration
  const _force = Unit.modelName;

  await cleanupTestData();

  // Create two societies
  societyA = await Society.create({
    name: 'Watchman Test Society A',
    address: 'Address A',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    active: true,
  });

  societyB = await Society.create({
    name: 'Watchman Test Society B',
    address: 'Address B',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400002',
    active: true,
  });

  // Create users
  const adminA = await User.create({
    email: 'admin-a-watch@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'admin',
    societyId: societyA._id,
    name: 'Admin A',
    status: 'active',
  });

  const adminB = await User.create({
    email: 'admin-b-watch@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'admin',
    societyId: societyB._id,
    name: 'Admin B',
    status: 'active',
  });

  const residentA = await User.create({
    email: 'resident-a-watch@test.societyos.in',
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
    name: { $in: ['Watchman Test Society A', 'Watchman Test Society B'] },
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

describe('Admin Watchman Account Creation API', () => {
  test('Happy Path: Admin A can create a Watchman account', async () => {
    const payload = {
      email: 'watchman-a@test.societyos.in',
      password: 'WatchmanPassword@123!',
      name: 'Guard A',
      phone: '+91 9876543211',
    };

    const req = new NextRequest('http://localhost/api/admin/users/watchman', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminAToken}`,
      },
      body: JSON.stringify(payload),
    });

    const res = await createWatchmanHandler(req, {} as any);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.user.email).toBe(payload.email);
    expect(body.user.role).toBe('watchman');
    expect(body.user.status).toBe('active');
    expect(body.user.societyId.toString()).toBe(societyA._id.toString());

    // Verify password was hashed correctly
    const dbUser = await User.findById(body.user.id).select('+passwordHash').setOptions({ unscoped: true });
    const isMatch = await comparePassword(payload.password, dbUser!.passwordHash);
    expect(isMatch).toBe(true);

    // Verify AuditLog was written
    const logs = await AuditLog.find({
      societyId: societyA._id,
      action: 'user.create',
      entityId: body.user.id,
    }).lean().setOptions({ unscoped: true });
    expect(logs.length).toBe(1);
  });

  test('Authorization Failure: Resident cannot create a Watchman account', async () => {
    const payload = {
      email: 'watchman-fail@test.societyos.in',
      password: 'WatchmanPassword@123!',
      name: 'Guard Fail',
    };

    const req = new NextRequest('http://localhost/api/admin/users/watchman', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${residentAToken}`,
      },
      body: JSON.stringify(payload),
    });

    const res = await createWatchmanHandler(req, {} as any);
    expect(res.status).toBe(403);
  });

  test('Tenant Scoping: Admin B cannot list or view Watchman created in Society A', async () => {
    // List users as Admin B -> should not contain Watchman A
    const listReq = new NextRequest('http://localhost/api/admin/users', {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${adminBToken}`,
      },
    });

    const listRes = await listUsersHandler(listReq, {} as any);
    expect(listRes.status).toBe(200);

    const listBody = await listRes.json();
    const emails = listBody.users.map((u: any) => u.email);
    expect(emails).not.toContain('watchman-a@test.societyos.in');
  });
});
