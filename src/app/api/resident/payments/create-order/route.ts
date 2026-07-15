import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import dbConnect from '@/lib/db/connection';
import MaintenanceBill from '@/models/MaintenanceBill';
import Payment from '@/models/Payment';
import { withAuth } from '@/lib/auth/middleware';

// POST /api/resident/payments/create-order — Create a Razorpay order for a resident's own bill
export const POST = withAuth(
  async (req, { auth }) => {
    try {
      const body = await req.json();
      const { billId } = body;

      if (!billId) {
        return NextResponse.json({ error: 'billId is required' }, { status: 400 });
      }

      await dbConnect();

      // Find the bill. Tenant-scoping plugin automatically scopes this to the resident's societyId.
      const bill = await MaintenanceBill.findById(billId);
      if (!bill) {
        return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
      }

      // Ensure the bill belongs to the resident's assigned unit
      if (!auth.unitId || bill.unitId.toString() !== auth.unitId.toString()) {
        return NextResponse.json(
          { error: 'Forbidden: You can only pay bills for your own unit' },
          { status: 403 }
        );
      }

      // Reject if the bill is already Paid
      if (bill.status === 'Paid') {
        return NextResponse.json(
          { error: 'Bill is already Paid' },
          { status: 409 }
        );
      }

      let order;
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      // Mock for test environments or placeholder configs
      if (
        process.env.NODE_ENV === 'test' ||
        !keyId ||
        keyId === 'rzp_test_placeholder' ||
        !keySecret ||
        keySecret === 'placeholder_secret'
      ) {
        order = {
          id: `order_${Math.random().toString(36).substring(2, 11)}`,
          amount: Math.round(bill.amount * 100),
          currency: 'INR',
        };
      } else {
        const razorpay = new Razorpay({
          key_id: keyId,
          key_secret: keySecret,
        });

        order = await razorpay.orders.create({
          amount: Math.round(bill.amount * 100), // amount in paise
          currency: 'INR',
          receipt: bill._id.toString(),
        });
      }

      // Create a pending Payment record in our database
      const payment = await Payment.create({
        societyId: auth.societyId!,
        billId: bill._id,
        amount: bill.amount,
        paymentMethod: 'razorpay',
        razorpayOrderId: order.id,
        status: 'pending',
      });

      return NextResponse.json(
        {
          orderId: order.id,
          amount: order.amount,
          currency: 'INR',
          paymentId: payment._id,
          billId: bill._id,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('[Resident:Payments] Create order error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  { roles: ['resident'] }
);
