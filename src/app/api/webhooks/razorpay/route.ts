import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db/connection';
import MaintenanceBill from '@/models/MaintenanceBill';
import Payment from '@/models/Payment';
import Receipt from '@/models/Receipt';
import { logAuditEvent } from '@/lib/audit/logger';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-razorpay-signature');
    if (!signature) {
      console.warn('[Webhook:Razorpay] Missing signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[Webhook:Razorpay] RAZORPAY_WEBHOOK_SECRET is not configured');
      return NextResponse.json({ error: 'Webhook configuration error' }, { status: 500 });
    }

    const rawBody = await req.text();

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.warn('[Webhook:Razorpay] Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Now safe to parse the body
    const body = JSON.parse(rawBody);
    const eventId = body.id;
    const eventType = body.event;

    await dbConnect();

    // Check for duplicate event (idempotency safety)
    if (eventId) {
      const existingPayment = await Payment.findOne({ razorpayEventId: eventId })
        .setOptions({ unscoped: true });
      if (existingPayment) {
        return NextResponse.json({
          received: true,
          message: 'Webhook event already processed (idempotent no-op)',
        });
      }
    }

    const paymentData = body.payload?.payment?.entity;
    if (!paymentData) {
      return NextResponse.json({ error: 'Invalid payload: missing payment entity' }, { status: 400 });
    }

    const orderId = paymentData.order_id;
    const paymentId = paymentData.id;

    if (eventType === 'payment.captured') {
      // Find the pending Payment record
      const payment = await Payment.findOne({ razorpayOrderId: orderId })
        .setOptions({ unscoped: true });

      if (!payment) {
        console.warn(`[Webhook:Razorpay] Payment record not found for order_id: ${orderId}`);
        return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
      }

      // Find the associated bill
      const bill = await MaintenanceBill.findById(payment.billId)
        .setOptions({ unscoped: true });

      if (!bill) {
        console.warn(`[Webhook:Razorpay] MaintenanceBill not found for ID: ${payment.billId}`);
        return NextResponse.json({ error: 'Maintenance bill not found' }, { status: 404 });
      }

      // Check if already paid
      if (bill.status === 'Paid') {
        // If the bill is already marked Paid, just finalize the payment details if pending
        if (payment.status === 'pending') {
          payment.status = 'captured';
          payment.razorpayPaymentId = paymentId;
          payment.razorpayEventId = eventId;
          await payment.save();
        }
        return NextResponse.json({ received: true, message: 'Bill already paid' });
      }

      // Update bill to Paid
      bill.status = 'Paid';
      await bill.save();

      // Finalize Payment record
      payment.status = 'captured';
      payment.razorpayPaymentId = paymentId;
      payment.razorpayEventId = eventId;
      payment.razorpaySignature = signature;
      await payment.save();

      // Generate a receipt number and save a new Receipt
      const receiptCount = await Receipt.countDocuments({}).setOptions({ unscoped: true });
      const cleanBillingPeriod = bill.billingPeriod.replace('-', '');
      const receiptNumber = `RCP-${cleanBillingPeriod}-${String(receiptCount + 1).padStart(4, '0')}`;

      const receipt = await Receipt.create({
        societyId: payment.societyId,
        paymentId: payment._id,
        billId: bill._id,
        receiptNumber,
        amount: payment.amount,
        paidAt: new Date(),
      });

      // Audit Log for Payment Received
      await logAuditEvent({
        action: 'payment.received',
        entityType: 'Payment',
        entityId: payment._id,
        afterState: {
          billId: bill._id.toString(),
          amount: payment.amount,
          receiptNumber,
        },
        actorId: '000000000000000000000000', // Processed automatically via webhook
        societyId: payment.societyId.toString(),
      });

      return NextResponse.json({
        received: true,
        status: 'success',
        billId: bill._id,
        receiptNumber,
      });
    } else if (eventType === 'payment.failed') {
      // Find the pending Payment record and mark it failed
      const payment = await Payment.findOne({ razorpayOrderId: orderId })
        .setOptions({ unscoped: true });

      if (payment && payment.status === 'pending') {
        payment.status = 'failed';
        payment.razorpayPaymentId = paymentId;
        payment.razorpayEventId = eventId;
        await payment.save();
      }

      return NextResponse.json({
        received: true,
        status: 'failed_recorded',
        orderId,
      });
    }

    return NextResponse.json({ received: true, message: 'Unhandled event type' });
  } catch (error) {
    console.error('[Webhook:Razorpay] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
