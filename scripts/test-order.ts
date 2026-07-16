import mongoose from 'mongoose';
import { runWithTenantContext } from '@/lib/tenant/context';
import MaintenanceBill from '@/models/MaintenanceBill';
import Payment from '@/models/Payment';
import User from '@/models/User';
require('dotenv').config({path: '.env.local'});
import Razorpay from 'razorpay';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const user = await User.findOne({ email: 'pk@gmail.com' });
  const auth = { societyId: user!.societyId, userId: user!._id, unitId: user!.unitId };
  
  await runWithTenantContext(
    { societyId: auth.societyId!.toString(), userId: auth.userId.toString(), role: 'resident' },
    async () => {
      const bill = await MaintenanceBill.findOne();
      console.log('Bill:', bill?._id);
      
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      console.log('Keys:', keyId, keySecret);
      
      if (!keyId || keyId === 'rzp_test_placeholder') {
          console.log("Mock fallback would run");
          return;
      }
      
      const razorpay = new Razorpay({
        key_id: keyId!,
        key_secret: keySecret!,
      });

      try {
        const order = await razorpay.orders.create({
          amount: Math.round(bill!.amount * 100),
          currency: 'INR',
          receipt: bill!._id.toString(),
        });
        console.log('Order created:', order.id);
        
        const payment = await Payment.create({
          societyId: auth.societyId!,
          billId: bill!._id,
          amount: bill!.amount,
          paymentMethod: 'razorpay',
          razorpayOrderId: order.id,
          status: 'pending',
        });
        console.log('Payment created:', payment._id);
      } catch (e) {
        console.error('Error:', e);
      }
    }
  );
  process.exit(0);
}
main().catch(console.error);
