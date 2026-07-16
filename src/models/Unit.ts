import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { tenantScopingPlugin } from '@/lib/tenant/scopingPlugin';

// --- Unit Interface ---

export interface IUnit extends Document {
  _id: Types.ObjectId;
  societyId: Types.ObjectId;
  unitNumber: string;
  block: string;
  floor: number;
  type: string; // e.g., '1BHK', '2BHK', '3BHK', 'Shop'
  areaSqFt: number;
  primaryResidentId: Types.ObjectId | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

const unitSchema = new Schema<IUnit>(
  {
    unitNumber: {
      type: String,
      required: [true, 'Unit number is required'],
      trim: true,
      maxlength: 20,
    },
    block: {
      type: String,
      trim: true,
      default: '',
    },
    floor: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      trim: true,
      default: '2BHK',
    },
    areaSqFt: {
      type: Number,
      default: 0,
      min: 0,
    },
    primaryResidentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id;
        ret.squareFeet = ret.areaSqFt;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Apply tenant scoping plugin — adds societyId field + query hooks
unitSchema.plugin(tenantScopingPlugin);

// Compound unique: unitNumber unique within a society
unitSchema.index({ societyId: 1, block: 1, unitNumber: 1 }, { unique: true });

const Unit: Model<IUnit> =
  mongoose.models.Unit || mongoose.model<IUnit>('Unit', unitSchema);

export default Unit;
