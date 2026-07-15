import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env.local') });

import { POST as signupHandler } from '@/app/api/auth/signup/route';
import { POST as approveHandler } from '@/app/api/admin/users/[id]/approve/route';
import { GET as listUsersHandler } from '@/app/api/admin/users/route';
import Society from '@/models/Society';
import Unit from '@/models/Unit';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { signAccessToken } from '@/lib/auth/jwt';

let societyA: any;
let societyB: any;
let unitA1: any;
let unitB1: any;
let adminAToken: string;
let adminBToken: string;
let residentAToken: string;
const dummyAdminAId = new mongoose.Types.ObjectId().toString();
const dummyAdminBId = new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not set in .env.local');
  }
  await mongoose.connect(mongoUri);

  await cleanupTestData();

  // Create societies
  societyA = await Society.create({
    name: 'Resident Test Society A',
    address: 'Address A',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    active: true,
  });

  societyB = await Society.create({
    name: 'Resident Test Society B',
    address: 'Address B',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400002',
    active: true,
  });

  // Create units
  unitA1 = await Unit.create({
    unitNumber: 'Flat 101',
    floor: 1,
    societyId: societyA._id,
  });

  unitB1 = await Unit.create({
    unitNumber: 'Flat 101',
    floor: 1,
    societyId: societyB._id,
  });

  // Create admins
  const adminA = await User.create({
    email: 'admin-a-res@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'admin',
    societyId: societyA._id,
    name: 'Admin A',
    status: 'active',
  });

  const adminB = await User.create({
    email: 'admin-b-res@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'admin',
    societyId: societyB._id,
    name: 'Admin B',
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
});

afterAll(async () => {
  await cleanupTestData();
  await mongoose.disconnect();
});

async function cleanupTestData() {
  const testSocieties = await Society.find({
    name: { $in: ['Resident Test Society A', 'Resident Test Society B'] },
  }).lean();
  const testSocietyIds = testSocieties.map(s => s._id);

  if (testSocietyIds.length > 0) {
    await Unit.deleteMany({ societyId: { $in: testSocietyIds } }).setOptions({ unscoped: true });
    await User.deleteMany({ societyId: { $in: testSocietyIds } }).setOptions({ unscoped: true });
    await mongoose.connection.collection('auditlogs').deleteMany({
      societyId: { $in: testSocietyIds },
    });
    await Society.deleteMany({ _id: { $in: testSocietyIds } });
  }
}

describe('Resident Signup & Approval Flow', () => {
  test('Happy Path: Resident can sign up and Admin can approve', async () => {
    // 1. Resident signs up for Society A, Unit A1
    const signupPayload = {
      email: 'resident-happy@test.societyos.in',
      password: 'ResidentPassword@123!',
      name: 'Happy Resident',
      phone: '+91 9876543210',
      societyId: societyA._id.toString(),
      unitId: unitA1._id.toString(),
    };

    const signupReq = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(signupPayload),
    });

    const signupRes = await signupHandler(signupReq);
    expect(signupRes.status).toBe(201);

    const signupBody = await signupRes.json();
    const residentId = signupBody.user.id;

    // 2. Admin A approves the resident
    const approveReq = new NextRequest(`http://localhost/api/admin/users/${residentId}/approve`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminAToken}`,
      },
      body: JSON.stringify({ approved: true }),
    });

    const approveRes = await approveHandler(approveReq, { params: { id: residentId } } as any);
    expect(approveRes.status).toBe(200);

    // Verify resident status is active and unit primary resident is set
    const updatedResident = await User.findById(residentId).setOptions({ unscoped: true });
    expect(updatedResident!.status).toBe('active');

    const updatedUnit = await Unit.findById(unitA1._id).setOptions({ unscoped: true });
    expect(updatedUnit!.primaryResidentId?.toString()).toBe(residentId);

    // Verify AuditLog was written
    const logs = await AuditLog.find({
      societyId: societyA._id,
      action: 'user.approve',
      entityId: residentId,
    }).lean().setOptions({ unscoped: true });
    expect(logs.length).toBe(1);
  });

  test('Duplicate Claim: Second resident signs up claiming same Unit -> contestedUnit set to true on both', async () => {
    // 1. First Resident signs up
    const r1Payload = {
      email: 'resident-claim1@test.societyos.in',
      password: 'ResidentPassword@123!',
      name: 'Claimant One',
      societyId: societyA._id.toString(),
      unitId: unitA1._id.toString(),
    };
    const r1Req = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(r1Payload),
    });
    const r1Res = await signupHandler(r1Req);
    expect(r1Res.status).toBe(201);
    const r1Id = (await r1Res.json()).user.id;

    // 2. Second Resident signs up claiming same unit
    const r2Payload = {
      email: 'resident-claim2@test.societyos.in',
      password: 'ResidentPassword@123!',
      name: 'Claimant Two',
      societyId: societyA._id.toString(),
      unitId: unitA1._id.toString(),
    };
    const r2Req = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(r2Payload),
    });
    const r2Res = await signupHandler(r2Req);
    expect(r2Res.status).toBe(201);
    const r2Id = (await r2Res.json()).user.id;

    // Verify both are flagged as contestedUnit: true
    const user1 = await User.findById(r1Id).setOptions({ unscoped: true });
    const user2 = await User.findById(r2Id).setOptions({ unscoped: true });

    expect(user1!.contestedUnit).toBe(true);
    expect(user2!.contestedUnit).toBe(true);
  });

  test('Authorization Failure: Non-admin cannot approve a resident', async () => {
    // Create a pending resident
    const rPayload = {
      email: 'resident-noauth@test.societyos.in',
      password: 'ResidentPassword@123!',
      name: 'NoAuth Resident',
      societyId: societyA._id.toString(),
    };
    const rReq = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(rPayload),
    });
    const rRes = await signupHandler(rReq);
    const rId = (await rRes.json()).user.id;

    // Try to approve using another resident's token (or sign a resident token for r1)
    residentAToken = signAccessToken({
      userId: rId,
      role: 'resident',
      societyId: societyA._id.toString(),
    });

    const approveReq = new NextRequest(`http://localhost/api/admin/users/${rId}/approve`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${residentAToken}`,
      },
      body: JSON.stringify({ approved: true }),
    });

    const approveRes = await approveHandler(approveReq, { params: { id: rId } } as any);
    expect(approveRes.status).toBe(403);
  });

  test('Tenant Scoping: Admin A cannot approve or list users from Society B', async () => {
    // 1. Create a pending resident in Society B
    const rPayload = {
      email: 'resident-society-b@test.societyos.in',
      password: 'ResidentPassword@123!',
      name: 'Society B Resident',
      societyId: societyB._id.toString(),
      unitId: unitB1._id.toString(),
    };
    const rReq = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(rPayload),
    });
    const rRes = await signupHandler(rReq);
    const rId = (await rRes.json()).user.id;

    // Admin A tries to approve Resident B -> returns 404/500 depending on search scoping.
    // In our User query scoping, it adds { societyId: AdminA.societyId }, so finding user with id of Society B returns null.
    // So the approval endpoint returns 404. Let's assert that!
    const approveReq = new NextRequest(`http://localhost/api/admin/users/${rId}/approve`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminAToken}`,
      },
      body: JSON.stringify({ approved: true }),
    });
    const approveRes = await approveHandler(approveReq, { params: { id: rId } } as any);
    expect(approveRes.status).toBe(404);

    // Admin A tries to list users -> only returns Society A users
    const listReq = new NextRequest('http://localhost/api/admin/users', {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${adminAToken}`,
      },
    });
    const listRes = await listUsersHandler(listReq, {} as any);
    expect(listRes.status).toBe(200);

    const listBody = await listRes.json();
    for (const u of listBody.users) {
      expect(u.societyId.toString()).toBe(societyA._id.toString());
      expect(u._id.toString()).not.toBe(rId); // Should not see Resident B
    }
  });

  test('Global Email Uniqueness: Users in two different societies cannot register with the same email', async () => {
    const email = 'duplicate-global-email@test.societyos.in';

    // 1. Sign up in Society A
    const signup1Payload = {
      email,
      password: 'ResidentPassword@123!',
      name: 'Resident A',
      societyId: societyA._id.toString(),
      unitId: unitA1._id.toString(),
    };
    const req1 = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(signup1Payload),
    });
    const res1 = await signupHandler(req1);
    expect(res1.status).toBe(201);

    // 2. Try to sign up in Society B with the same email
    const signup2Payload = {
      email,
      password: 'ResidentPassword@123!',
      name: 'Resident B',
      societyId: societyB._id.toString(),
      unitId: unitB1._id.toString(),
    };
    const req2 = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(signup2Payload),
    });
    const res2 = await signupHandler(req2);
    expect(res2.status).toBe(409);
    const body2 = await res2.json();
    expect(body2.error).toContain('already exists');
  });
});
