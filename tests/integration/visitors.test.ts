import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env.local') });

import { POST as preApproveHandler } from '@/app/api/resident/visitors/pre-approve/route';
import { POST as scanHandler } from '@/app/api/watchman/visitors/scan/route';
import { POST as manualEntryHandler } from '@/app/api/watchman/visitors/manual/route';
import { POST as syncHandler } from '@/app/api/watchman/visitors/sync/route';
import { GET as getInsideHandler } from '@/app/api/watchman/visitors/inside/route';
import Society from '@/models/Society';
import Unit from '@/models/Unit';
import User from '@/models/User';
import Visitor from '@/models/Visitor';
import AuditLog from '@/models/AuditLog';
import { signAccessToken } from '@/lib/auth/jwt';

let societyA: any;
let societyB: any;
let unitA1: any;
let unitB1: any;
let residentA1Token: string;
let watchmanA1Token: string;
let watchmanB1Token: string;
let adminA1Token: string;

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not set in .env.local');
  }
  await mongoose.connect(mongoUri);

  // Force register models to avoid missing schema errors in tests
  const _forceVisitor = Visitor.modelName;
  const _forceUnit = Unit.modelName;

  await cleanupTestData();

  // Create societies (Society A has maxVisitorWindowHours set to 12)
  societyA = await Society.create({
    name: 'Visitor Test Society A',
    address: 'Address A',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    active: true,
    maxVisitorWindowHours: 12,
  });

  societyB = await Society.create({
    name: 'Visitor Test Society B',
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
    unitNumber: 'Flat 201',
    floor: 2,
    societyId: societyB._id,
  });

  // Create users
  const resA1 = await User.create({
    email: 'resident-a1-vis@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'resident',
    societyId: societyA._id,
    unitId: unitA1._id,
    name: 'Resident A1',
    status: 'active',
  });

  const watchmanA1 = await User.create({
    email: 'watch-a1-vis@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'watchman',
    societyId: societyA._id,
    name: 'Watchman A1',
    status: 'active',
  });

  const watchmanB1 = await User.create({
    email: 'watch-b1-vis@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'watchman',
    societyId: societyB._id,
    name: 'Watchman B1',
    status: 'active',
  });

  const adminA1 = await User.create({
    email: 'admin-a1-vis@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'admin',
    societyId: societyA._id,
    name: 'Admin A1',
    status: 'active',
  });

  residentA1Token = signAccessToken({
    userId: resA1._id.toString(),
    role: 'resident',
    societyId: societyA._id.toString(),
    unitId: unitA1._id.toString(),
  });

  watchmanA1Token = signAccessToken({
    userId: watchmanA1._id.toString(),
    role: 'watchman',
    societyId: societyA._id.toString(),
  });

  watchmanB1Token = signAccessToken({
    userId: watchmanB1._id.toString(),
    role: 'watchman',
    societyId: societyB._id.toString(),
  });

  adminA1Token = signAccessToken({
    userId: adminA1._id.toString(),
    role: 'admin',
    societyId: societyA._id.toString(),
  });
});

afterAll(async () => {
  await cleanupTestData();
  await mongoose.disconnect();
});

async function cleanupTestData() {
  const testSocieties = await Society.find({
    name: { $in: ['Visitor Test Society A', 'Visitor Test Society B'] },
  }).lean();
  const testSocietyIds = testSocieties.map(s => s._id);

  if (testSocietyIds.length > 0) {
    await Visitor.deleteMany({ societyId: { $in: testSocietyIds } }).setOptions({ unscoped: true });
    await Unit.deleteMany({ societyId: { $in: testSocietyIds } }).setOptions({ unscoped: true });
    await User.deleteMany({ societyId: { $in: testSocietyIds } }).setOptions({ unscoped: true });
    await mongoose.connection.collection('auditlogs').deleteMany({
      societyId: { $in: testSocietyIds },
    });
    await Society.deleteMany({ _id: { $in: testSocietyIds } });
  }
}

describe('Visitors, QR Pre-approvals, and Watchman Portal API', () => {
  let validToken: string;
  let expiredToken: string;
  let futureToken: string;

  test('Happy Path: Resident A1 can generate a pre-approval token (4 hour window)', async () => {
    const start = new Date();
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000); // 4 hours

    const payload = {
      visitorName: 'PreApproved Guest',
      startWindow: start.toISOString(),
      endWindow: end.toISOString(),
    };

    const req = new NextRequest('http://localhost/api/resident/visitors/pre-approve', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${residentA1Token}`,
      },
      body: JSON.stringify(payload),
    });

    const res = await preApproveHandler(req, {} as any);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.token).toBeDefined();
    validToken = body.token;

    // Verify AuditLog
    const logs = await AuditLog.find({
      societyId: societyA._id,
      action: 'visitor.pre_approve',
    }).lean().setOptions({ unscoped: true });
    expect(logs.length).toBe(1);
  });

  test('Max Window Enforcement: Pre-approval request longer than society max (12 hours) is rejected', async () => {
    const start = new Date();
    const end = new Date(start.getTime() + 13 * 60 * 60 * 1000); // 13 hours (exceeds max of 12)

    const payload = {
      visitorName: 'Long Window Guest',
      startWindow: start.toISOString(),
      endWindow: end.toISOString(),
    };

    const req = new NextRequest('http://localhost/api/resident/visitors/pre-approve', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${residentA1Token}`,
      },
      body: JSON.stringify(payload),
    });

    const res = await preApproveHandler(req, {} as any);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('exceeds society maximum');
  });

  test('Happy Path: Watchman A1 can scan and check in a pre-approved visitor', async () => {
    const req = new NextRequest('http://localhost/api/watchman/visitors/scan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${watchmanA1Token}`,
      },
      body: JSON.stringify({ token: validToken }),
    });

    const res = await scanHandler(req, {} as any);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.code).toBe('verified');
    expect(body.visitor.preApproved).toBe(true);
    expect(body.visitor.verificationStatus).toBe('verified');

    // Verify in DB
    const dbVis = await Visitor.findById(body.visitor.id).setOptions({ unscoped: true });
    expect(dbVis!.visitorName).toBe('PreApproved Guest');

    // Verify AuditLog
    const logs = await AuditLog.find({
      societyId: societyA._id,
      action: 'visitor.manual_entry',
      entityId: body.visitor.id,
    }).lean().setOptions({ unscoped: true });
    expect(logs.length).toBe(1);
  });

  test('Idempotency/Single-use: Scanning same token again returns already-used error', async () => {
    const req = new NextRequest('http://localhost/api/watchman/visitors/scan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${watchmanA1Token}`,
      },
      body: JSON.stringify({ token: validToken }),
    });

    const res = await scanHandler(req, {} as any);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.code).toBe('already-used');
  });

  test('Clock Skew Tolerance: Token scanned slightly before start time is accepted', async () => {
    // Start window is 30 seconds in the future
    const start = new Date(Date.now() + 30 * 1000);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    const payload = {
      visitorName: 'Skew Guest',
      startWindow: start.toISOString(),
      endWindow: end.toISOString(),
    };

    const req1 = new NextRequest('http://localhost/api/resident/visitors/pre-approve', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${residentA1Token}`,
      },
      body: JSON.stringify(payload),
    });
    const res1 = await preApproveHandler(req1, {} as any);
    futureToken = (await res1.json()).token;

    // Scan immediately (before nominal start time)
    const req2 = new NextRequest('http://localhost/api/watchman/visitors/scan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${watchmanA1Token}`,
      },
      body: JSON.stringify({ token: futureToken }),
    });

    const res2 = await scanHandler(req2, {} as any);
    expect(res2.status).toBe(201); // Tolerated due to clock-skew margin
    const body2 = await res2.json();
    expect(body2.code).toBe('verified');
  });

  test('Expiry test: Scanning an expired token is rejected with expired code', async () => {
    // End window was 5 minutes ago
    const start = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const end = new Date(Date.now() - 5 * 60 * 1000);

    const payload = {
      visitorName: 'Expired Guest',
      startWindow: start.toISOString(),
      endWindow: end.toISOString(),
    };

    const req1 = new NextRequest('http://localhost/api/resident/visitors/pre-approve', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${residentA1Token}`,
      },
      body: JSON.stringify(payload),
    });
    const res1 = await preApproveHandler(req1, {} as any);
    expiredToken = (await res1.json()).token;

    // Scan expired
    const req2 = new NextRequest('http://localhost/api/watchman/visitors/scan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${watchmanA1Token}`,
      },
      body: JSON.stringify({ token: expiredToken }),
    });

    const res2 = await scanHandler(req2, {} as any);
    expect(res2.status).toBe(400);
    const body2 = await res2.json();
    expect(body2.code).toBe('expired');
  });

  test('Scoping & Forgery: Watchman B1 cannot scan Society A token; forged token is rejected', async () => {
    // 1. Wrong Society Scan
    const req1 = new NextRequest('http://localhost/api/watchman/visitors/scan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${watchmanB1Token}`, // Watchman B
      },
      body: JSON.stringify({ token: futureToken }), // Generated in Society A
    });
    const res1 = await scanHandler(req1, {} as any);
    expect(res1.status).toBe(400);
    const body1 = await res1.json();
    expect(body1.code).toBe('wrong-society');

    // 2. Token Forgery
    const tamperedToken = futureToken.substring(0, futureToken.length - 4) + 'abcd';
    const req2 = new NextRequest('http://localhost/api/watchman/visitors/scan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${watchmanA1Token}`,
      },
      body: JSON.stringify({ token: tamperedToken }),
    });
    const res2 = await scanHandler(req2, {} as any);
    expect(res2.status).toBe(400);
    const body2 = await res2.json();
    expect(body2.code).toBe('invalid-signature');
  });

  test('Manual entry: Watchman A1 can log an unscheduled visitor', async () => {
    const payload = {
      visitorName: 'Manual Guest',
      unitId: unitA1._id.toString(),
    };

    const req = new NextRequest('http://localhost/api/watchman/visitors/manual', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${watchmanA1Token}`,
      },
      body: JSON.stringify(payload),
    });

    const res = await manualEntryHandler(req, {} as any);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.visitor.preApproved).toBe(false);
    expect(body.visitor.verificationStatus).toBe('unverified');

    // Verify AuditLog
    const logs = await AuditLog.find({
      societyId: societyA._id,
      action: 'visitor.manual_entry',
      entityId: body.visitor.id,
    }).lean().setOptions({ unscoped: true });
    expect(logs.length).toBe(1);
  });

  test('Live inside view: Watchman and Admin can view currently inside visitors', async () => {
    const req = new NextRequest('http://localhost/api/watchman/visitors/inside', {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${watchmanA1Token}`,
      },
    });

    const res = await getInsideHandler(req, {} as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    const names = body.visitors.map((v: any) => v.visitorName);
    expect(names).toContain('PreApproved Guest');
    expect(names).toContain('Manual Guest');
  });

  test('Offline Batch Sync: Processes independent results, uses capture time', async () => {
    // Generate valid token for sync (encompasses client capture time of 2 hours ago)
    const start = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
    const end = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    const reqToken = new NextRequest('http://localhost/api/resident/visitors/pre-approve', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${residentA1Token}`,
      },
      body: JSON.stringify({
        visitorName: 'Sync Valid PreApproved',
        startWindow: start.toISOString(),
        endWindow: end.toISOString(),
      }),
    });
    const resToken = await preApproveHandler(reqToken, {} as any);
    const syncValidToken = (await resToken.json()).token;

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const payload = {
      entries: [
        {
          visitorName: 'Sync Valid PreApproved',
          entryTime: twoHoursAgo,
          preApproved: true,
          token: syncValidToken,
        },
        {
          visitorName: 'Sync Bad Token',
          entryTime: thirtyMinsAgo,
          preApproved: true,
          token: 'bad.forged.token',
        },
        {
          visitorName: 'Sync Valid Manual',
          entryTime: thirtyMinsAgo,
          preApproved: false,
          unitId: unitA1._id.toString(),
        },
      ],
    };

    const req = new NextRequest('http://localhost/api/watchman/visitors/sync', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${watchmanA1Token}`,
      },
      body: JSON.stringify(payload),
    });

    const res = await syncHandler(req, {} as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.results.length).toBe(3);

    // Entry 1 (Success)
    expect(body.results[0].success).toBe(true);
    expect(body.results[0].code).toBe('verified');
    const vis1 = await Visitor.findById(body.results[0].visitorId).setOptions({ unscoped: true });
    expect(vis1!.entryTime.toISOString()).toBe(twoHoursAgo); // Verify original client capture timestamp preserved!

    // Entry 2 (Failure)
    expect(body.results[1].success).toBe(false);
    expect(body.results[1].code).toBe('invalid-signature');

    // Entry 3 (Success)
    expect(body.results[2].success).toBe(true);
    expect(body.results[2].code).toBe('unverified');
    const vis3 = await Visitor.findById(body.results[2].visitorId).setOptions({ unscoped: true });
    expect(vis3!.entryTime.toISOString()).toBe(thirtyMinsAgo); // Verify original client capture timestamp preserved!
  });
});
