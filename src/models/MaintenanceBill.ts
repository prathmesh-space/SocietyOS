import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { tenantScopingPlugin } from '@/lib/tenant/scopingPlugin';

export interface IMaintenanceBill extends Document {
  _id: Types.ObjectId;
  societyId: Types.ObjectId;
  unitId: Types.ObjectId;
  billingPeriod: string; // YYYY-MM
  amount: number;
  dueDate: Date;
  status: 'Unpaid' | 'Paid' | 'Overdue';
  lateFeeApplied: boolean;
  lateFeeAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const maintenanceBillSchema = new Schema<IMaintenanceBill>(
  {
    unitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: [true, 'Unit ID is required'],
      index: true,
    },
    billingPeriod: {
      type: String,
      required: [true, 'Billing period (YYYY-MM) is required'],
      validate: {
        validator: (v: string) => /^\d{4}-\d{2}$/.test(v),
        message: 'Billing period must be in YYYY-MM format',
      },
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    status: {
      type: String,
      enum: ['Unpaid', 'Paid', 'Overdue'],
      default: 'Unpaid',
    },
    lateFeeApplied: {
      type: Boolean,
      default: false,
    },
    lateFeeAmount: {
      type: Number,
      default: 0,
      min: 0,
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
maintenanceBillSchema.plugin(tenantScopingPlugin);

// Compound unique index to prevent duplicate bill generation for the same period in a unit of a society
maintenanceBillSchema.index({ societyId: 1, unitId: 1, billingPeriod: 1 }, { unique: true });

if (process.env.NODE_ENV !== 'production') {
  delete mongoose.models.MaintenanceBill;
}

const MaintenanceBill: Model<IMaintenanceBill> =
  mongoose.models.MaintenanceBill || mongoose.model<IMaintenanceBill>('MaintenanceBill', maintenanceBillSchema);

export default MaintenanceBill;
