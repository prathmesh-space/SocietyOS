import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env.local') });

import { POST as generateBillsHandler } from '@/app/api/admin/bills/generate/route';
import { POST as lateFeesHandler } from '@/app/api/jobs/late-fees/route';
import Society from '@/models/Society';
import Unit from '@/models/Unit';
import User from '@/models/User';
import MaintenanceBill from '@/models/MaintenanceBill';
import AuditLog from '@/models/AuditLog';
import { signAccessToken } from '@/lib/auth/jwt';

let societyA: any;
let societyB: any;
let unitA1: any;
let unitA2: any;
let unitB1: any;
let adminAToken: string;
let residentAToken: string;

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not set in .env.local');
  }
  await mongoose.connect(mongoUri);

  // Force register models to avoid Mongoose schema registration issues in tests
  const _forceBill = MaintenanceBill.modelName;
  const _forceUnit = Unit.modelName;

  await cleanupTestData();

  // Create societies with default billing and late fee rules
  societyA = await Society.create({
    name: 'Billing Test Society A',
    address: 'Address A',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    active: true,
    defaultBillAmount: 5000,
    lateFeeRule: {
      type: 'percentage',
      value: 10, // 10% late fee
      gracePeriodDays: 5,
    },
  });

  societyB = await Society.create({
    name: 'Billing Test Society B',
    address: 'Address B',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400002',
    active: true,
    defaultBillAmount: 6000,
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

  // Create admin
  const adminA = await User.create({
    email: 'admin-a-bill@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'admin',
    societyId: societyA._id,
    name: 'Admin A',
    status: 'active',
  });

  // Create resident
  const residentA = await User.create({
    email: 'resident-a-bill@test.societyos.in',
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
    name: { $in: ['Billing Test Society A', 'Billing Test Society B'] },
  }).lean();
  const testSocietyIds = testSocieties.map(s => s._id);

  if (testSocietyIds.length > 0) {
    await MaintenanceBill.deleteMany({ societyId: { $in: testSocietyIds } }).setOptions({ unscoped: true });
    await Unit.deleteMany({ societyId: { $in: testSocietyIds } }).setOptions({ unscoped: true });
    await User.deleteMany({ societyId: { $in: testSocietyIds } }).setOptions({ unscoped: true });
    await mongoose.connection.collection('auditlogs').deleteMany({
      societyId: { $in: testSocietyIds },
    });
    await Society.deleteMany({ _id: { $in: testSocietyIds } });
  }
}

describe('Maintenance Billing Management API & Late Fees Job', () => {
  test('Happy Path: Admin A can bulk generate bills for a period', async () => {
    const payload = {
      billingPeriod: '2026-07',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const req = new NextRequest('http://localhost/api/admin/bills/generate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminAToken}`,
      },
      body: JSON.stringify(payload),
    });

    const res = await generateBillsHandler(req, {} as any);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.count).toBe(2); // Flat 101 and Flat 102

    // Verify bills were generated in database for society A
    const bills = await MaintenanceBill.find({ societyId: societyA._id, billingPeriod: '2026-07' })
      .lean()
      .setOptions({ unscoped: true });
    expect(bills.length).toBe(2);
    for (const b of bills) {
      expect(b.amount).toBe(5000);
      expect(b.status).toBe('Unpaid');
      expect(b.societyId.toString()).toBe(societyA._id.toString());
    }

    // Verify AuditLog was written
    const logs = await AuditLog.find({
      societyId: societyA._id,
      action: 'bill.generate',
    }).lean().setOptions({ unscoped: true });
    expect(logs.length).toBe(1);
  });

  test('Duplicate Bill Generation Check: Re-generating bills for same period returns 409 Conflict', async () => {
    const payload = {
      billingPeriod: '2026-07',
      dueDate: new Date().toISOString(),
    };

    const req = new NextRequest('http://localhost/api/admin/bills/generate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminAToken}`,
      },
      body: JSON.stringify(payload),
    });

    const res = await generateBillsHandler(req, {} as any);
    expect(res.status).toBe(409);

    const body = await res.json();
    expect(body.error).toContain('already been generated');
  });

  test('Billing Override: Admin can generate bills with overrides', async () => {
    const payload = {
      billingPeriod: '2026-08',
      dueDate: new Date().toISOString(),
      overrides: [
        { unitId: unitA1._id.toString(), amount: 7500 },
      ],
    };

    const req = new NextRequest('http://localhost/api/admin/bills/generate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${adminAToken}`,
      },
      body: JSON.stringify(payload),
    });

    const res = await generateBillsHandler(req, {} as any);
    expect(res.status).toBe(201);

    const billA1 = await MaintenanceBill.findOne({ billingPeriod: '2026-08', unitId: unitA1._id })
      .lean()
      .setOptions({ unscoped: true });
    expect(billA1!.amount).toBe(7500);

    const billA2 = await MaintenanceBill.findOne({ billingPeriod: '2026-08', unitId: unitA2._id })
      .lean()
      .setOptions({ unscoped: true });
    expect(billA2!.amount).toBe(5000); // Defaults to society default amount
  });

  test('Authorization Failure: Resident cannot generate bills', async () => {
    const req = new NextRequest('http://localhost/api/admin/bills/generate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${residentAToken}`,
      },
      body: JSON.stringify({
        billingPeriod: '2026-09',
        dueDate: new Date().toISOString(),
      }),
    });

    const res = await generateBillsHandler(req, {} as any);
    expect(res.status).toBe(403);
  });

  test('Late Fees Scheduled Job: Applies late fee past grace period exactly once', async () => {
    // 1. Create a bill due 10 days ago (past the 5 days grace period)
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const overdueBill = await MaintenanceBill.create({
      societyId: societyA._id,
      unitId: unitA1._id,
      billingPeriod: '2026-06',
      amount: 1000,
      dueDate: tenDaysAgo,
      status: 'Unpaid',
      lateFeeApplied: false,
    });

    // 2. Trigger late fees job
    const req1 = new NextRequest('http://localhost/api/jobs/late-fees', {
      method: 'POST',
    });
    const res1 = await lateFeesHandler(req1);
    expect(res1.status).toBe(200);

    // Verify late fee is applied (10% of 1000 = 100)
    const updatedBill = await MaintenanceBill.findById(overdueBill._id)
      .setOptions({ unscoped: true });
    expect(updatedBill!.amount).toBe(1100);
    expect(updatedBill!.lateFeeAmount).toBe(100);
    expect(updatedBill!.lateFeeApplied).toBe(true);
    expect(updatedBill!.status).toBe('Overdue');

    // Verify batch AuditLog was written
    const logs = await AuditLog.find({
      societyId: societyA._id,
      action: 'bill.late_fee_applied',
    }).lean().setOptions({ unscoped: true });
    expect(logs.length).toBe(1);
    expect(logs[0]!.afterState.totalBillsUpdated).toBe(1);
    expect(logs[0]!.afterState.totalLateFeeApplied).toBe(100);

    // 3. Trigger late fees job a second time to ensure idempotency (should not double-apply)
    const req2 = new NextRequest('http://localhost/api/jobs/late-fees', {
      method: 'POST',
    });
    const res2 = await lateFeesHandler(req2);
    expect(res2.status).toBe(200);

    const doubleUpdatedBill = await MaintenanceBill.findById(overdueBill._id)
      .setOptions({ unscoped: true });
    expect(doubleUpdatedBill!.amount).toBe(1100); // Remains 1100, not 1200 or 1210
    expect(doubleUpdatedBill!.lateFeeAmount).toBe(100);
  });
});
