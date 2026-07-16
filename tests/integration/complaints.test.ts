import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env.local') });

import { GET as listResidentComplaintsHandler, POST as createComplaintHandler } from '@/app/api/resident/complaints/route';
import { GET as getComplaintDetailHandler } from '@/app/api/resident/complaints/[id]/route';
import { POST as reopenComplaintHandler } from '@/app/api/resident/complaints/[id]/reopen/route';
import { GET as listAdminComplaintsHandler } from '@/app/api/admin/complaints/route';
import { PATCH as assignComplaintHandler } from '@/app/api/admin/complaints/[id]/assign/route';
import { PATCH as updateStatusHandler } from '@/app/api/admin/complaints/[id]/status/route';
import Society from '@/models/Society';
import Unit from '@/models/Unit';
import User from '@/models/User';
import Complaint from '@/models/Complaint';
import AuditLog from '@/models/AuditLog';
import { signAccessToken } from '@/lib/auth/jwt';

let societyA: any;
let societyB: any;
let unitA1: any;
let unitA2: any;
let unitB1: any;
let residentA1Token: string;
let residentA2Token: string;
let residentB1Token: string;
let adminA1Token: string;
let adminA2Token: string;
let adminB1Token: string;
let adminA2: any;

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not set in .env.local');
  }
  await mongoose.connect(mongoUri);

  // Force register models to avoid missing schema registration issues
  const _forceComplaint = Complaint.modelName;
  const _forceUnit = Unit.modelName;

  await cleanupTestData();

  // Create societies
  societyA = await Society.create({
    name: 'Complaint Test Society A',
    address: 'Address A',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    active: true,
    emergencyContacts: [{ name: 'Test', phone: '1234567890', role: 'Security' }],
  });

  societyB = await Society.create({
    name: 'Complaint Test Society B',
    address: 'Address B',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400002',
    active: true,
    emergencyContacts: [{ name: 'Test', phone: '1234567890', role: 'Security' }],
  });

  // Create units
  unitA1 = await Unit.create({
    unitNumber: 'Flat 101',
    floor: 1,
    societyId: societyA._id,
  });

  unitA2 = await Unit.create({
    unitNumber: 'Flat 102',
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
    email: 'resident-a1-comp@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'resident',
    societyId: societyA._id,
    unitId: unitA1._id,
    name: 'Resident A1',
    status: 'active',
  });

  const resA2 = await User.create({
    email: 'resident-a2-comp@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'resident',
    societyId: societyA._id,
    unitId: unitA2._id,
    name: 'Resident A2',
    status: 'active',
  });

  const resB1 = await User.create({
    email: 'resident-b1-comp@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'resident',
    societyId: societyB._id,
    unitId: unitB1._id,
    name: 'Resident B1',
    status: 'active',
  });

  const adminA1 = await User.create({
    email: 'admin-a1-comp@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'admin',
    societyId: societyA._id,
    name: 'Admin A1',
    status: 'active',
  });

  adminA2 = await User.create({
    email: 'admin-a2-comp@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'admin',
    societyId: societyA._id,
    name: 'Admin A2',
    status: 'active',
  });

  const adminB1 = await User.create({
    email: 'admin-b1-comp@test.societyos.in',
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

  residentA2Token = signAccessToken({
    userId: resA2._id.toString(),
    role: 'resident',
    societyId: societyA._id.toString(),
    unitId: unitA2._id.toString(),
  });

  residentB1Token = signAccessToken({
    userId: resB1._id.toString(),
    role: 'resident',
    societyId: societyB._id.toString(),
    unitId: unitB1._id.toString(),
  });

  adminA1Token = signAccessToken({
    userId: adminA1._id.toString(),
    role: 'admin',
    societyId: societyA._id.toString(),
  });

  adminA2Token = signAccessToken({
    userId: adminA2._id.toString(),
    role: 'admin',
    societyId: societyA._id.toString(),
  });

  adminB1Token = signAccessToken({
    userId: adminB1._id.toString(),
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
    name: { $in: ['Complaint Test Society A', 'Complaint Test Society B'] },
  }).lean();
  const testSocietyIds = testSocieties.map(s => s._id);

  if (testSocietyIds.length > 0) {
    await Complaint.deleteMany({ societyId: { $in: testSocietyIds } }).setOptions({ unscoped: true });
    await Unit.deleteMany({ societyId: { $in: testSocietyIds } }).setOptions({ unscoped: true });
    await User.deleteMany({ societyId: { $in: testSocietyIds } }).setOptions({ unscoped: true });
    await mongoose.connection.collection('auditlogs').deleteMany({
      societyId: { $in: testSocietyIds },
    });
    await Society.deleteMany({ _id: { $in: testSocietyIds } });
  }
}

describe('Complaints Management & Status Pipeline API', () => {
  let complaintId: string;

  test('Happy Path: Resident A1 can file a complaint', async () => {
    const payload = {
      category: 'Plumbing',
      title: 'Pipe leakage',
      description: 'Main pipe leakage in the master bedroom toilet',
    };

    const req = new NextRequest('http://localhost/api/resident/complaints', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${residentA1Token}`,
      },
      body: JSON.stringify(payload),
    });

    const res = await createComplaintHandler(req, {} as any);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.complaint.id).toBeDefined();
    complaintId = body.complaint.id;

    // Verify it is created in DB
    const dbComp = await Complaint.findById(complaintId).setOptions({ unscoped: true });
    expect(dbComp!.category).toBe(payload.category);
    expect(dbComp!.title).toBe(payload.title);
    expect(dbComp!.status).toBe('Open');
    expect(dbComp!.residentId.toString()).toBe(new mongoose.Types.ObjectId(body.complaint.residentId).toString());

    // Verify AuditLog was written
    const logs = await AuditLog.find({
      societyId: societyA._id,
      action: 'complaint.create',
      entityId: complaintId,
    }).lean().setOptions({ unscoped: true });
    expect(logs.length).toBe(1);
  });

  test('Happy Path: Resident A1 can list and view own complaint', async () => {
    // 1. GET list own
    const listReq = new NextRequest('http://localhost/api/resident/complaints', {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${residentA1Token}`,
      },
    });
    const listRes = await listResidentComplaintsHandler(listReq, {} as any);
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(listBody.complaints.length).toBe(1);
    expect(listBody.complaints[0].id).toBe(complaintId);

    // 2. GET view own detail
    const detailReq = new NextRequest(`http://localhost/api/resident/complaints/${complaintId}`, {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${residentA1Token}`,
      },
    });
    const detailRes = await getComplaintDetailHandler(detailReq, { params: { id: complaintId } } as any);
    expect(detailRes.status).toBe(200);
    const detailBody = await detailRes.json();
    expect(detailBody.complaint.id).toBe(complaintId);
  });

  test('Ownership Security: Resident A2 cannot view Resident A1\'s complaint', async () => {
    const req = new NextRequest(`http://localhost/api/resident/complaints/${complaintId}`, {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${residentA2Token}`,
      },
    });
    const res = await getComplaintDetailHandler(req, { params: { id: complaintId } } as any);
    expect(res.status).toBe(403);
  });

  test('Scoping Security: Resident B1 cannot view Resident A1\'s complaint', async () => {
    const req = new NextRequest(`http://localhost/api/resident/complaints/${complaintId}`, {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${residentB1Token}`,
      },
    });
    const res = await getComplaintDetailHandler(req, { params: { id: complaintId } } as any);
    // Returns 404 since it's in a different tenant context entirely
    expect(res.status).toBe(404);
  });

  test('Admin endpoints: Admin A1 can list complaints in their society filterable by status', async () => {
    // List Open -> should contain complaintId
    const req1 = new NextRequest('http://localhost/api/admin/complaints?status=Open', {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${adminA1Token}`,
      },
    });
    const res1 = await listAdminComplaintsHandler(req1, {} as any);
    expect(res1.status).toBe(200);
    const body1 = await res1.json();
    const ids1 = body1.complaints.map((c: any) => c.id);
    expect(ids1).toContain(complaintId);

    // List Resolved -> should be empty
    const req2 = new NextRequest('http://localhost/api/admin/complaints?status=Resolved', {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${adminA1Token}`,
      },
    });
    const res2 = await listAdminComplaintsHandler(req2, {} as any);
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    const ids2 = body2.complaints.map((c: any) => c.id);
    expect(ids2).not.toContain(complaintId);
  });

  test('Admin endpoints: Admin A1 can assign complaint to Admin A2', async () => {
    const req = new NextRequest(`http://localhost/api/admin/complaints/${complaintId}/assign`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminA1Token}`,
      },
      body: JSON.stringify({ assignedAdminId: adminA2._id.toString() }),
    });

    const res = await assignComplaintHandler(req, { params: { id: complaintId } } as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.complaint.assignedAdminId.toString()).toBe(adminA2._id.toString());

    // Verify AuditLog was written
    const logs = await AuditLog.find({
      societyId: societyA._id,
      action: 'complaint.assign',
      entityId: complaintId,
    }).lean().setOptions({ unscoped: true });
    expect(logs.length).toBe(1);
    expect((logs[0]!.afterState as any).assignedAdminId.toString()).toBe(adminA2._id.toString());
  });

  test('Status Pipeline: Skipping pipeline from Open -> Closed must be rejected', async () => {
    const req = new NextRequest(`http://localhost/api/admin/complaints/${complaintId}/status`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminA1Token}`,
      },
      body: JSON.stringify({ status: 'Closed' }),
    });

    const res = await updateStatusHandler(req, { params: { id: complaintId } } as any);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('Invalid status transition');
    expect(body.error).toContain('Open');
    expect(body.error).toContain('Closed');

    // Assert status remains unchanged in DB
    const dbComp = await Complaint.findById(complaintId).setOptions({ unscoped: true });
    expect(dbComp!.status).toBe('Open');
  });

  test('Status Pipeline: Open -> In Progress is permitted', async () => {
    const req = new NextRequest(`http://localhost/api/admin/complaints/${complaintId}/status`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminA1Token}`,
      },
      body: JSON.stringify({ status: 'In Progress' }),
    });

    const res = await updateStatusHandler(req, { params: { id: complaintId } } as any);
    expect(res.status).toBe(200);

    const dbComp = await Complaint.findById(complaintId).setOptions({ unscoped: true });
    expect(dbComp!.status).toBe('In Progress');
  });

  test('Status Pipeline: Moving to Resolved without resolutionNote must be rejected', async () => {
    const req = new NextRequest(`http://localhost/api/admin/complaints/${complaintId}/status`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminA1Token}`,
      },
      body: JSON.stringify({ status: 'Resolved' }),
    });

    const res = await updateStatusHandler(req, { params: { id: complaintId } } as any);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('resolution note is required');

    // Assert status remains In Progress
    const dbComp = await Complaint.findById(complaintId).setOptions({ unscoped: true });
    expect(dbComp!.status).toBe('In Progress');
  });

  test('Status Pipeline: Moving to Resolved with resolutionNote is permitted', async () => {
    const req = new NextRequest(`http://localhost/api/admin/complaints/${complaintId}/status`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminA1Token}`,
      },
      body: JSON.stringify({ status: 'Resolved', resolutionNote: 'Fixed leakage by replacing washer' }),
    });

    const res = await updateStatusHandler(req, { params: { id: complaintId } } as any);
    expect(res.status).toBe(200);

    const dbComp = await Complaint.findById(complaintId).setOptions({ unscoped: true });
    expect(dbComp!.status).toBe('Resolved');
    expect(dbComp!.resolutionNote).toBe('Fixed leakage by replacing washer');

    // Verify AuditLog resolving
    const logs = await AuditLog.find({
      societyId: societyA._id,
      action: 'complaint.resolve',
      entityId: complaintId,
    }).lean().setOptions({ unscoped: true });
    expect(logs.length).toBe(1);
  });

  test('Status Pipeline: Resolved -> Closed is permitted', async () => {
    const req = new NextRequest(`http://localhost/api/admin/complaints/${complaintId}/status`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminA1Token}`,
      },
      body: JSON.stringify({ status: 'Closed' }),
    });

    const res = await updateStatusHandler(req, { params: { id: complaintId } } as any);
    expect(res.status).toBe(200);

    const dbComp = await Complaint.findById(complaintId).setOptions({ unscoped: true });
    expect(dbComp!.status).toBe('Closed');

    // Verify AuditLog closing
    const logs = await AuditLog.find({
      societyId: societyA._id,
      action: 'complaint.close',
      entityId: complaintId,
    }).lean().setOptions({ unscoped: true });
    expect(logs.length).toBe(1);
  });

  test('Reopening: Reopening Closed complaint creates NEW record, original Closed is untouched', async () => {
    const req = new NextRequest(`http://localhost/api/resident/complaints/${complaintId}/reopen`, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${residentA1Token}`,
      },
    });

    const res = await reopenComplaintHandler(req, { params: { id: complaintId } } as any);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.complaint.id).toBeDefined();
    expect(body.complaint.id).not.toBe(complaintId);
    expect(body.complaint.reopenedFromId.toString()).toBe(complaintId);
    expect(body.complaint.status).toBe('Open');

    // Verify original Closed complaint is completely untouched
    const original = await Complaint.findById(complaintId).setOptions({ unscoped: true });
    expect(original!.status).toBe('Closed');
    expect(original!.resolutionNote).toBe('Fixed leakage by replacing washer');

    // Verify new AuditLog for the new complaint
    const newLogs = await AuditLog.find({
      societyId: societyA._id,
      action: 'complaint.create',
      entityId: body.complaint.id,
    }).lean().setOptions({ unscoped: true });
    expect(newLogs.length).toBe(1);
    expect((newLogs[0]!.afterState as any).reopenedFromId.toString()).toBe(complaintId);
  });
});
