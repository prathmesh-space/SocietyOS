import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { tenantScopingPlugin } from '@/lib/tenant/scopingPlugin';

export interface IPayment extends Document {
  _id: Types.ObjectId;
  societyId: Types.ObjectId;
  billId: Types.ObjectId;
  amount: number;
  paymentMethod: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  razorpaySignature: string | null;
  razorpayEventId: string | null;
  status: 'pending' | 'captured' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    billId: {
      type: Schema.Types.ObjectId,
      ref: 'MaintenanceBill',
      required: [true, 'Bill ID is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    paymentMethod: {
      type: String,
      default: 'razorpay',
    },
    razorpayOrderId: {
      type: String,
      required: [true, 'Razorpay order ID is required'],
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    razorpayEventId: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'captured', 'failed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Apply tenant scoping plugin - adds societyId field + query hooks
paymentSchema.plugin(tenantScopingPlugin);

// Unique index on Razorpay event ID specifically to enforce webhook idempotency (sparse unique index)
paymentSchema.index({ razorpayEventId: 1 }, { unique: true, sparse: true });

if (process.env.NODE_ENV !== 'production') {
  delete mongoose.models.Payment;
}

const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', paymentSchema);

export default Payment;
