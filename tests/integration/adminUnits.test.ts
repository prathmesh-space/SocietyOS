import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env.local') });

import { POST as createUnitHandler, GET as listUnitsHandler } from '@/app/api/admin/units/route';
import { POST as bulkImportHandler } from '@/app/api/admin/units/bulk-import/route';
import { GET as getUnitHandler, PATCH as updateUnitHandler, DELETE as deleteUnitHandler } from '@/app/api/admin/units/[id]/route';
import Society from '@/models/Society';
import Unit from '@/models/Unit';
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

  // Clean up any potential test data
  await cleanupTestData();

  // Create two societies for scoping/isolation checks
  societyA = await Society.create({
    name: 'Unit Test Society A',
    address: 'Address A',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    active: true,
    emergencyContacts: [{ name: 'Test', phone: '1234567890', role: 'Security' }],
  });

  societyB = await Society.create({
    name: 'Unit Test Society B',
    address: 'Address B',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400002',
    active: true,
    emergencyContacts: [{ name: 'Test', phone: '1234567890', role: 'Security' }],
  });

  // Create users to obtain valid tokens
  const adminA = await User.create({
    email: 'admin-a-units@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'admin',
    societyId: societyA._id,
    name: 'Admin A',
    status: 'active',
  });

  const adminB = await User.create({
    email: 'admin-b-units@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'admin',
    societyId: societyB._id,
    name: 'Admin B',
    status: 'active',
  });

  const residentA = await User.create({
    email: 'resident-a-units@test.societyos.in',
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
    name: { $in: ['Unit Test Society A', 'Unit Test Society B'] },
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

describe('Admin Units Management API', () => {
  test('Happy Path: Admin A can add an individual unit', async () => {
    const payload = {
      unitNumber: 'A-101',
      floor: 1,
      type: '2BHK',
      areaSqFt: 850,
    };

    const req = new NextRequest('http://localhost/api/admin/units', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminAToken}`,
      },
      body: JSON.stringify(payload),
    });

    const res = await createUnitHandler(req, {} as any);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.unit.unitNumber).toBe(payload.unitNumber);
    expect(body.unit.societyId.toString()).toBe(societyA._id.toString());

    // Verify AuditLog was written
    const logs = await AuditLog.find({
      societyId: societyA._id,
      action: 'unit.create',
      entityId: body.unit.id,
    }).lean().setOptions({ unscoped: true });
    expect(logs.length).toBe(1);
  });

  test('Enforce Uniqueness: Adding duplicate unitNumber within same society returns conflict 409', async () => {
    const payload = {
      unitNumber: 'A-101',
      floor: 1,
      type: '2BHK',
      areaSqFt: 850,
    };

    const req = new NextRequest('http://localhost/api/admin/units', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminAToken}`,
      },
      body: JSON.stringify(payload),
    });

    const res = await createUnitHandler(req, {} as any);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain('already exists');
  });

  test('Happy Path: Admin A can bulk-import units', async () => {
    const payload = {
      units: [
        { unitNumber: 'A-102', floor: 1, type: '2BHK', areaSqFt: 850 },
        { unitNumber: 'A-201', floor: 2, type: '3BHK', areaSqFt: 1200 },
        { unitNumber: 'A-202', floor: 2, type: '3BHK', areaSqFt: 1200 },
      ],
    };

    const req = new NextRequest('http://localhost/api/admin/units/bulk-import', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminAToken}`,
      },
      body: JSON.stringify(payload),
    });

    const res = await bulkImportHandler(req, {} as any);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.results.created.length).toBe(3);

    // Verify bulk import AuditLog was written
    const logs = await AuditLog.find({
      societyId: societyA._id,
      action: 'unit.bulk_import',
    }).lean().setOptions({ unscoped: true });
    expect(logs.length).toBe(1);
  });

  test('Authorization Failure: Resident cannot add units or bulk import', async () => {
    // 1. Individual create
    const reqCreate = new NextRequest('http://localhost/api/admin/units', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${residentAToken}`,
      },
      body: JSON.stringify({ unitNumber: 'A-301' }),
    });
    const resCreate = await createUnitHandler(reqCreate, {} as any);
    expect(resCreate.status).toBe(403);

    // 2. Bulk import
    const reqBulk = new NextRequest('http://localhost/api/admin/units/bulk-import', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${residentAToken}`,
      },
      body: JSON.stringify({ units: [{ unitNumber: 'A-301' }] }),
    });
    const resBulk = await bulkImportHandler(reqBulk, {} as any);
    expect(resBulk.status).toBe(403);
  });

  test('Tenant Scoping: Admin A cannot see or modify Society B units', async () => {
    // Let's create a unit in Society B first
    const unitB = await Unit.create({
      unitNumber: 'B-101',
      floor: 1,
      societyId: societyB._id,
    });

    // Admin A tries to GET Society B's unit by ID -> returns 404
    const reqGet = new NextRequest(`http://localhost/api/admin/units/${unitB._id}`, {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${adminAToken}`,
      },
    });
    const resGet = await getUnitHandler(reqGet, { params: { id: unitB._id.toString() } } as any);
    expect(resGet.status).toBe(404);

    // Admin A tries to PATCH Society B's unit -> returns 404
    const reqPatch = new NextRequest(`http://localhost/api/admin/units/${unitB._id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminAToken}`,
      },
      body: JSON.stringify({ floor: 99 }),
    });
    const resPatch = await updateUnitHandler(reqPatch, { params: { id: unitB._id.toString() } } as any);
    expect(resPatch.status).toBe(404);

    // Admin A tries to DELETE Society B's unit -> returns 404
    const reqDelete = new NextRequest(`http://localhost/api/admin/units/${unitB._id}`, {
      method: 'DELETE',
      headers: {
        'authorization': `Bearer ${adminAToken}`,
      },
    });
    const resDelete = await deleteUnitHandler(reqDelete, { params: { id: unitB._id.toString() } } as any);
    expect(resDelete.status).toBe(404);
  });
});
