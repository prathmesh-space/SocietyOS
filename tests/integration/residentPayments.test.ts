import mongoose from 'mongoose';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env.local') });

import { POST as createOrderHandler } from '@/app/api/resident/payments/create-order/route';
import { POST as webhookHandler } from '@/app/api/webhooks/razorpay/route';
import { GET as getReceiptHandler } from '@/app/api/resident/receipts/[id]/route';
import { GET as getBillsHandler } from '@/app/api/resident/bills/route';
import Society from '@/models/Society';
import Unit from '@/models/Unit';
import User from '@/models/User';
import MaintenanceBill from '@/models/MaintenanceBill';
import Payment from '@/models/Payment';
import Receipt from '@/models/Receipt';
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
let adminAToken: string;
let billA1: any;
let billA2: any;
let billB1: any;

const WEBHOOK_SECRET = 'test_webhook_secret_key_12345';

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not set in .env.local');
  }
  await mongoose.connect(mongoUri);

  // Force register models
  const _forceBill = MaintenanceBill.modelName;
  const _forcePayment = Payment.modelName;
  const _forceReceipt = Receipt.modelName;
  const _forceUnit = Unit.modelName;

  // Set webhook secret for tests
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

  await cleanupTestData();

  // Create societies
  societyA = await Society.create({
    name: 'Payment Test Society A',
    address: 'Address A',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    active: true,
    emergencyContacts: [{ name: 'Test', phone: '1234567890', role: 'Security' }],
  });

  societyB = await Society.create({
    name: 'Payment Test Society B',
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
    email: 'resident-a1-pay@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'resident',
    societyId: societyA._id,
    unitId: unitA1._id,
    name: 'Resident A1',
    status: 'active',
  });

  const resA2 = await User.create({
    email: 'resident-a2-pay@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'resident',
    societyId: societyA._id,
    unitId: unitA2._id,
    name: 'Resident A2',
    status: 'active',
  });

  const resB1 = await User.create({
    email: 'resident-b1-pay@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'resident',
    societyId: societyB._id,
    unitId: unitB1._id,
    name: 'Resident B1',
    status: 'active',
  });

  const adminA = await User.create({
    email: 'admin-a-pay@test.societyos.in',
    passwordHash: 'dummyhash',
    role: 'admin',
    societyId: societyA._id,
    name: 'Admin A',
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

  adminAToken = signAccessToken({
    userId: adminA._id.toString(),
    role: 'admin',
    societyId: societyA._id.toString(),
  });

  // Create bills
  billA1 = await MaintenanceBill.create({
    societyId: societyA._id,
    unitId: unitA1._id,
    billingPeriod: '2026-07',
    amount: 5000,
    dueDate: new Date(),
    status: 'Unpaid',
  });

  billA2 = await MaintenanceBill.create({
    societyId: societyA._id,
    unitId: unitA2._id,
    billingPeriod: '2026-07',
    amount: 4500,
    dueDate: new Date(),
    status: 'Unpaid',
  });

  billB1 = await MaintenanceBill.create({
    societyId: societyB._id,
    unitId: unitB1._id,
    billingPeriod: '2026-07',
    amount: 6000,
    dueDate: new Date(),
    status: 'Unpaid',
  });
});

afterAll(async () => {
  await cleanupTestData();
  await mongoose.disconnect();
});

async function cleanupTestData() {
  try {
    await mongoose.connection.db!.collection('payments').drop();
  } catch (e) {}
  try {
    await mongoose.connection.db!.collection('receipts').drop();
  } catch (e) {}

  const testSocieties = await Society.find({
    name: { $in: ['Payment Test Society A', 'Payment Test Society B'] },
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

// Helper to generate a valid webhook request and signature
function createWebhookRequest(bodyObj: any, secret = WEBHOOK_SECRET) {
  const bodyStr = JSON.stringify(bodyObj);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(bodyStr)
    .digest('hex');

  return new NextRequest('http://localhost/api/webhooks/razorpay', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': signature,
    },
    body: bodyStr,
  });
}

describe('Razorpay Order Creation, Webhooks, Receipts, and Security', () => {
  test('Happy Path: Resident A1 can create an order for their own bill', async () => {
    const req = new NextRequest('http://localhost/api/resident/payments/create-order', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${residentA1Token}`,
      },
      body: JSON.stringify({ billId: billA1._id.toString() }),
    });

    const res = await createOrderHandler(req, {} as any);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.orderId).toBeDefined();
    expect(body.paymentId).toBeDefined();
    expect(body.amount).toBe(500000); // 5000 Rupees in Paise

    // Check payment record status is pending in DB
    const payment = await Payment.findById(body.paymentId).setOptions({ unscoped: true });
    expect(payment!.status).toBe('pending');
    expect(payment!.razorpayOrderId).toBe(body.orderId);
  });

  test('Authorization Failure: Resident A2 cannot create an order for Resident A1\'s bill', async () => {
    const req = new NextRequest('http://localhost/api/resident/payments/create-order', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${residentA2Token}`,
      },
      body: JSON.stringify({ billId: billA1._id.toString() }),
    });

    const res = await createOrderHandler(req, {} as any);
    expect(res.status).toBe(403);
  });

  test('Scoping Security: Resident B1 cannot create an order for Resident A1\'s bill', async () => {
    const req = new NextRequest('http://localhost/api/resident/payments/create-order', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${residentB1Token}`,
      },
      body: JSON.stringify({ billId: billA1._id.toString() }),
    });

    const res = await createOrderHandler(req, {} as any);
    // Since Resident B is in Society B, scoping plugin scopes query to Society B, returning 404 (Not Found).
    expect(res.status).toBe(404);
  });

  test('Reject if already paid: Cannot create order for a Paid bill', async () => {
    // 1. Force mark bill A2 as Paid
    billA2.status = 'Paid';
    await billA2.save();

    // 2. Try to generate order
    const req = new NextRequest('http://localhost/api/resident/payments/create-order', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${residentA2Token}`,
      },
      body: JSON.stringify({ billId: billA2._id.toString() }),
    });

    const res = await createOrderHandler(req, {} as any);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain('already Paid');
  });

  test('Webhook Signature Verification: Rejected with 400 if signature is tampered/invalid', async () => {
    const payload = {
      id: 'evt_test_sig',
      entity: 'event',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_sig_test',
            amount: 500000,
            order_id: 'order_some_fake_id',
            status: 'captured',
          },
        },
      },
    };

    // Construct request with wrong secret (invalid signature)
    const req = createWebhookRequest(payload, 'wrong_secret_signature_test');
    const res = await webhookHandler(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('Invalid signature');
  });

  test('Webhook Signature Verification: Rejected with 500 if webhook secret is not configured', async () => {
    const originalSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;

    const payload = {
      id: 'evt_test_unconfig',
      entity: 'event',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_unconfig_test',
            amount: 500000,
            order_id: 'order_some_fake_id',
            status: 'captured',
          },
        },
      },
    };

    const req = createWebhookRequest(payload, 'any_secret');
    const res = await webhookHandler(req);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe('Webhook configuration error');

    // Restore secret
    process.env.RAZORPAY_WEBHOOK_SECRET = originalSecret;
  });

  test('Webhook processing: payment.captured event updates status & creates receipt', async () => {
    // 1. Create a pending payment
    const payment = await Payment.create({
      societyId: societyA._id,
      billId: billA1._id,
      amount: billA1.amount,
      paymentMethod: 'razorpay',
      razorpayOrderId: 'order_test_captured',
      status: 'pending',
    });

    const eventId = 'evt_test_payment_captured';
    const payload = {
      id: eventId,
      entity: 'event',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_razorpay_999',
            amount: billA1.amount * 100,
            order_id: 'order_test_captured',
            status: 'captured',
          },
        },
      },
    };

    const req = createWebhookRequest(payload);
    const res = await webhookHandler(req);
    expect(res.status).toBe(200);

    const resBody = await res.json();
    expect(resBody.status).toBe('success');
    expect(resBody.receiptNumber).toBeDefined();

    // Verify bill is now Paid
    const updatedBill = await MaintenanceBill.findById(billA1._id).setOptions({ unscoped: true });
    expect(updatedBill!.status).toBe('Paid');

    // Verify Payment is marked captured
    const updatedPayment = await Payment.findById(payment._id).setOptions({ unscoped: true });
    expect(updatedPayment!.status).toBe('captured');
    expect(updatedPayment!.razorpayPaymentId).toBe('pay_razorpay_999');
    expect(updatedPayment!.razorpayEventId).toBe(eventId);

    // Verify Receipt is created
    const receipt = await Receipt.findOne({ paymentId: payment._id }).setOptions({ unscoped: true });
    expect(receipt).toBeDefined();
    expect(receipt!.amount).toBe(5000);
    expect(receipt!.receiptNumber).toBe(resBody.receiptNumber);

    // Verify AuditLog for payment received was written
    const logs = await AuditLog.find({
      societyId: societyA._id,
      action: 'payment.received',
    }).lean().setOptions({ unscoped: true });
    expect(logs.length).toBe(1);
    expect((logs[0]!.afterState as any).receiptNumber).toBe(resBody.receiptNumber);
  });

  test('Webhook Idempotency: Re-sending payment.captured is a no-op (does not re-process)', async () => {
    // Send same event payload from previous test (id: evt_test_payment_captured)
    const payload = {
      id: 'evt_test_payment_captured',
      entity: 'event',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_razorpay_999',
            amount: 500000,
            order_id: 'order_test_captured',
            status: 'captured',
          },
        },
      },
    };

    const req = createWebhookRequest(payload);
    const res = await webhookHandler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.message).toContain('already processed');

    // Verify only 1 receipt exists for the bill
    const receiptsCount = await Receipt.countDocuments({ billId: billA1._id }).setOptions({ unscoped: true });
    expect(receiptsCount).toBe(1);
  });

  test('Webhook failed: payment.failed event updates payment status, bill remains Unpaid', async () => {
    const payment = await Payment.create({
      societyId: societyA._id,
      billId: billA1._id,
      amount: billA1.amount,
      paymentMethod: 'razorpay',
      razorpayOrderId: 'order_test_failed',
      status: 'pending',
    });

    // Reset bill back to Unpaid for test validation in DB directly
    await MaintenanceBill.updateOne(
      { _id: billA1._id },
      { $set: { status: 'Unpaid' } },
      { unscoped: true } as any
    );

    const payload = {
      id: 'evt_test_payment_failed',
      entity: 'event',
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_failed_razorpay_888',
            amount: billA1.amount * 100,
            order_id: 'order_test_failed',
            status: 'failed',
          },
        },
      },
    };

    const req = createWebhookRequest(payload);
    const res = await webhookHandler(req);
    expect(res.status).toBe(200);

    // Verify Payment is marked failed
    const updatedPayment = await Payment.findById(payment._id).setOptions({ unscoped: true });
    expect(updatedPayment!.status).toBe('failed');

    // Verify Bill remains Unpaid
    const updatedBill = await MaintenanceBill.findById(billA1._id).setOptions({ unscoped: true });
    expect(updatedBill!.status).toBe('Unpaid');
  });

  test('Receipt Download: Resident can access own unit receipt, but not another unit\'s', async () => {
    // 1. Create a receipt for unit A1
    const payment = await Payment.create({
      societyId: societyA._id,
      billId: billA1._id,
      amount: 5000,
      paymentMethod: 'razorpay',
      razorpayOrderId: 'order_rcpt_test',
      status: 'captured',
    });

    const receipt = await Receipt.create({
      societyId: societyA._id,
      paymentId: payment._id,
      billId: billA1._id,
      receiptNumber: 'RCP-202607-9999',
      amount: 5000,
      paidAt: new Date(),
    });

    // Resident A1 queries their own receipt
    const req1 = new NextRequest(`http://localhost/api/resident/receipts/${receipt._id}`, {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${residentA1Token}`,
      },
    });

    const res1 = await getReceiptHandler(req1, { params: { id: receipt._id.toString() } } as any);
    expect(res1.status).toBe(200);

    const body1 = await res1.json();
    expect(body1.receipt.receiptNumber).toBe('RCP-202607-9999');

    // Resident A2 (different unit) queries the receipt
    const req2 = new NextRequest(`http://localhost/api/resident/receipts/${receipt._id}`, {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${residentA2Token}`,
      },
    });

    const res2 = await getReceiptHandler(req2, { params: { id: receipt._id.toString() } } as any);
    expect(res2.status).toBe(403);
  });

  test('GET /api/resident/bills: Happy path & Resident ownership (only own unit bills returned)', async () => {
    const req = new NextRequest('http://localhost/api/resident/bills', {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${residentA1Token}`,
      },
    });

    const res = await getBillsHandler(req, {} as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.bills).toBeDefined();
    expect(body.bills.length).toBeGreaterThan(0);
    // Should contain billA1 but not billA2 (different unit) or billB1 (different society)
    expect(body.bills.some((b: any) => b._id === billA1._id.toString())).toBe(true);
    expect(body.bills.some((b: any) => b._id === billA2._id.toString())).toBe(false);
    expect(body.bills.some((b: any) => b._id === billB1._id.toString())).toBe(false);
  });

  test('GET /api/resident/bills: Tenant scoping & ownership for Resident B1', async () => {
    const req = new NextRequest('http://localhost/api/resident/bills', {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${residentB1Token}`,
      },
    });

    const res = await getBillsHandler(req, {} as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.bills).toBeDefined();
    // Resident B1 should only see billB1
    expect(body.bills.some((b: any) => b._id === billB1._id.toString())).toBe(true);
    expect(body.bills.some((b: any) => b._id === billA1._id.toString())).toBe(false);
  });

  test('GET /api/resident/bills: Wrong-role auth failure (Admin cannot use resident route)', async () => {
    const req = new NextRequest('http://localhost/api/resident/bills', {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${adminAToken}`,
      },
    });

    const res = await getBillsHandler(req, {} as any);
    expect(res.status).toBe(403); // Forbidden
  });
});
