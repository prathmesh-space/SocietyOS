import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env.local') });

import { GET as adminGetNotices, POST as adminCreateNotice } from '@/app/api/admin/notices/route';
import { PATCH as adminEditNotice, DELETE as adminDeleteNotice } from '@/app/api/admin/notices/[id]/route';
import { GET as residentGetNotices } from '@/app/api/resident/notices/route';
import { GET as getAuditLogs, PATCH as patchAuditLogs, DELETE as deleteAuditLogs } from '@/app/api/admin/audit-log/route';
import { PATCH as superAdminPatchSociety } from '@/app/api/superadmin/societies/[id]/route';
import { PATCH as adminPatchSettings } from '@/app/api/admin/settings/route';
import Society from '@/models/Society';
import Unit from '@/models/Unit';
import User from '@/models/User';
import Notice from '@/models/Notice';
import AuditLog from '@/models/AuditLog';
import { signAccessToken } from '@/lib/auth/jwt';

let societyA: any;
let societyB: any;
let unitA1: any;
let unitB1: any;
let residentA1Token: string;
let adminA1Token: string;
let adminB1Token: string;
let superAdminToken: string;

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not set in .env.local');
  }
  await mongoose.connect(mongoUri);

  // Force register models to avoid missing schema errors in tests
  const _forceNotice = Notice.modelName;

  await cleanupTestData();

  // Create Society A (pre-populated with 1 emergency contact so it can be active)
  societyA = await Society.create({
    name: 'Notice Test Society A',
    address: 'Address A',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    active: true,
    emergencyContacts: [{ name: 'Fire Department', phone: '+91 1234567890', role: 'Fire' }],
  });

  // Create Society B (inactive by default, no emergency contacts)
  societyB = await Society.create({
    name: 'Notice Test Society B',
    address: 'Address B',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400002',
    active: false,
    emergencyContacts: [],
  });

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

  const resA1 = await User.create({
    email: 'resident-a1-not@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'resident',
    societyId: societyA._id,
    unitId: unitA1._id,
    name: 'Resident A1',
    status: 'active',
  });

  const adminA1 = await User.create({
    email: 'admin-a1-not@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'admin',
    societyId: societyA._id,
    name: 'Admin A1',
    status: 'active',
  });

  const adminB1 = await User.create({
    email: 'admin-b1-not@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'admin',
    societyId: societyB._id,
    name: 'Admin B1',
    status: 'active',
  });

  residentA1Token = signAccessToken({
    userId: resA1._id.toString(),
    role: 'resident',
    societyId: societyA._id.toString(),
    unitId: unitA1._id.toString(),
  });

  adminA1Token = signAccessToken({
    userId: adminA1._id.toString(),
    role: 'admin',
    societyId: societyA._id.toString(),
  });

  adminB1Token = signAccessToken({
    userId: adminB1._id.toString(),
    role: 'admin',
    societyId: societyB._id.toString(),
  });

  superAdminToken = signAccessToken({
    userId: new mongoose.Types.ObjectId().toString(),
    role: 'superadmin',
  });
});

afterAll(async () => {
  await cleanupTestData();
  await mongoose.disconnect();
});

async function cleanupTestData() {
  const testSocieties = await Society.find({
    name: { $in: ['Notice Test Society A', 'Notice Test Society B'] },
  }).lean();
  const testSocietyIds = testSocieties.map(s => s._id);

  if (testSocietyIds.length > 0) {
    await Notice.deleteMany({ societyId: { $in: testSocietyIds } }).setOptions({ unscoped: true });
    await Unit.deleteMany({ societyId: { $in: testSocietyIds } }).setOptions({ unscoped: true });
    await User.deleteMany({ societyId: { $in: testSocietyIds } }).setOptions({ unscoped: true });
    await mongoose.connection.collection('auditlogs').deleteMany({
      societyId: { $in: testSocietyIds },
    });
    await Society.deleteMany({ _id: { $in: testSocietyIds } });
  }
}

describe('Notices, Emergency Contacts, and Audit Logs API', () => {
  let noticeA1Id: string;
  let noticeA2Id: string;
  let noticeA3Id: string;

  test('Happy Path: Admin A1 can post a new notice with expiry', async () => {
    const expiry = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    const payload = {
      title: 'Water Supply Issue',
      body: 'Water supply will be offline on Sunday from 9am to 12pm.',
      expiryDate: expiry.toISOString(),
    };

    const req = new NextRequest('http://localhost/api/admin/notices', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminA1Token}`,
      },
      body: JSON.stringify(payload),
    });

    const res = await adminCreateNotice(req, {} as any);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.notice.id).toBeDefined();
    noticeA1Id = body.notice.id;
    expect(body.notice.title).toBe(payload.title);

    // Verify AuditLog was written
    const logs = await AuditLog.find({
      societyId: societyA._id,
      action: 'notice.create',
      entityId: noticeA1Id,
    }).lean().setOptions({ unscoped: true });
    expect(logs.length).toBe(1);
  });

  test('Resident Notices view: Lists active notices but EXCLUDES expired ones', async () => {
    // 1. Post an already expired notice
    const expiredDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const expiredPayload = {
      title: 'Past Notice',
      body: 'This notice expired in the past.',
      expiryDate: expiredDate.toISOString(),
    };
    const req1 = new NextRequest('http://localhost/api/admin/notices', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminA1Token}`,
      },
      body: JSON.stringify(expiredPayload),
    });
    const res1 = await adminCreateNotice(req1, {} as any);
    noticeA2Id = (await res1.json()).notice.id;

    // 2. Post a notice with NO expiry date (should remain active forever)
    const noExpiryPayload = {
      title: 'Permanent Rules',
      body: 'Please keep trash bags tied.',
    };
    const req2 = new NextRequest('http://localhost/api/admin/notices', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminA1Token}`,
      },
      body: JSON.stringify(noExpiryPayload),
    });
    const res2 = await adminCreateNotice(req2, {} as any);
    noticeA3Id = (await res2.json()).notice.id;

    // 3. Resident calls resident endpoint
    const residentReq = new NextRequest('http://localhost/api/resident/notices', {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${residentA1Token}`,
      },
    });
    const residentRes = await residentGetNotices(residentReq, {} as any);
    expect(residentRes.status).toBe(200);

    const body = await residentRes.json();
    const ids = body.notices.map((n: any) => n.id);

    expect(ids).toContain(noticeA1Id); // Active with future expiry
    expect(ids).toContain(noticeA3Id); // Active with no expiry
    expect(ids).not.toContain(noticeA2Id); // Excluded (expired notice)
  });

  test('Admin Notices view: Admin gets all notices including expired history', async () => {
    const adminReq = new NextRequest('http://localhost/api/admin/notices', {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${adminA1Token}`,
      },
    });
    const adminRes = await adminGetNotices(adminReq, {} as any);
    expect(adminRes.status).toBe(200);

    const body = await adminRes.json();
    const ids = body.notices.map((n: any) => n.id);

    expect(ids).toContain(noticeA1Id);
    expect(ids).toContain(noticeA2Id); // Included (admin sees history)
    expect(ids).toContain(noticeA3Id);
  });

  test('Happy Path: Admin A1 can edit a notice, setting lastEditedAt', async () => {
    const payload = {
      title: 'Water Supply Issue (UPDATED)',
      body: 'Sunday morning water supply shutdown extended by 1 hour.',
    };

    const req = new NextRequest(`http://localhost/api/admin/notices/${noticeA1Id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminA1Token}`,
      },
      body: JSON.stringify(payload),
    });

    const res = await adminEditNotice(req, { params: { id: noticeA1Id } } as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.notice.lastEditedAt).toBeDefined();
    expect(body.notice.lastEditedAt).not.toBeNull();
    expect(body.notice.title).toBe(payload.title);

    // Verify AuditLog was written
    const logs = await AuditLog.find({
      societyId: societyA._id,
      action: 'notice.update',
      entityId: noticeA1Id,
    }).lean().setOptions({ unscoped: true });
    expect(logs.length).toBe(1);
  });

  test('Tenant Scoping: Admin B1 cannot view or modify Society A notices', async () => {
    // 1. View scoping check
    const listReq = new NextRequest('http://localhost/api/admin/notices', {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${adminB1Token}`,
      },
    });
    const listRes = await adminGetNotices(listReq, {} as any);
    const body = await listRes.json();
    expect(body.notices.length).toBe(0);

    // 2. Modify scoping check (returns 404 since scoping hides Notice A1)
    const patchReq = new NextRequest(`http://localhost/api/admin/notices/${noticeA1Id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminB1Token}`,
      },
      body: JSON.stringify({ title: 'Hack Title' }),
    });
    const patchRes = await adminEditNotice(patchReq, { params: { id: noticeA1Id } } as any);
    expect(patchRes.status).toBe(404);
  });

  test('Audit Log Read-Only Protection: PATCH/DELETE methods return 405 Method Not Allowed', async () => {
    // 1. View logs happy path
    const getReq = new NextRequest('http://localhost/api/admin/audit-log', {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${adminA1Token}`,
      },
    });
    const getRes = await getAuditLogs(getReq, {} as any);
    expect(getRes.status).toBe(200);

    // 2. Try PATCH -> 405
    const patchReq = new NextRequest('http://localhost/api/admin/audit-log', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminA1Token}`,
      },
      body: JSON.stringify({ hack: true }),
    });
    const patchRes = await patchAuditLogs();
    expect(patchRes.status).toBe(405);

    // 3. Try DELETE -> 405
    const deleteReq = new NextRequest('http://localhost/api/admin/audit-log', {
      method: 'DELETE',
      headers: {
        'authorization': `Bearer ${adminA1Token}`,
      },
    });
    const deleteRes = await deleteAuditLogs();
    expect(deleteRes.status).toBe(405);
  });

  test('Emergency Contacts Activation: Cannot activate society with 0 emergency contacts', async () => {
    // Society B has 0 emergency contacts. Attempting to activate it should return 400.
    const req = new NextRequest(`http://localhost/api/superadmin/societies/${societyB._id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({ active: true }),
    });

    const res = await superAdminPatchSociety(req, { params: { id: societyB._id.toString() } } as any);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('At least one emergency contact is required');

    // 2. Add 1 emergency contact via Admin B settings
    const settingsPayload = {
      emergencyContacts: [
        { name: 'Gate 1 Security Guard', phone: '+91 9999988888', role: 'Security' },
      ],
    };
    const settingsReq = new NextRequest('http://localhost/api/admin/settings', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminB1Token}`,
      },
      body: JSON.stringify(settingsPayload),
    });
    const settingsRes = await adminPatchSettings(settingsReq, {} as any);
    expect(settingsRes.status).toBe(200);

    // 3. Super Admin attempts to activate Society B again (should now succeed)
    const reqSucceed = new NextRequest(`http://localhost/api/superadmin/societies/${societyB._id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({ active: true }),
    });
    const resSucceed = await superAdminPatchSociety(reqSucceed, { params: { id: societyB._id.toString() } } as any);
    expect(resSucceed.status).toBe(200);

    const bodySucceed = await resSucceed.json();
    expect(bodySucceed.society.active).toBe(true);
  });
});
