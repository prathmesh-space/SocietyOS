import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { tenantScopingPlugin } from '@/lib/tenant/scopingPlugin';

export interface IReceipt extends Document {
  _id: Types.ObjectId;
  societyId: Types.ObjectId;
  paymentId: Types.ObjectId;
  billId: Types.ObjectId;
  receiptNumber: string;
  amount: number;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const receiptSchema = new Schema<IReceipt>(
  {
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      required: [true, 'Payment ID is required'],
      unique: true, // One receipt per payment
      index: true,
    },
    billId: {
      type: Schema.Types.ObjectId,
      ref: 'MaintenanceBill',
      required: [true, 'Bill ID is required'],
      index: true,
    },
    receiptNumber: {
      type: String,
      required: [true, 'Receipt number is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    paidAt: {
      type: Date,
      required: [true, 'Paid date is required'],
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

// Apply tenant scoping plugin
receiptSchema.plugin(tenantScopingPlugin);

// Compound unique on receiptNumber within a society
receiptSchema.index({ societyId: 1, receiptNumber: 1 }, { unique: true });

const Receipt: Model<IReceipt> =
  mongoose.models.Receipt || mongoose.model<IReceipt>('Receipt', receiptSchema);

export default Receipt;
