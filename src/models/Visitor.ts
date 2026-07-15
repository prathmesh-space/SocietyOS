import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { tenantScopingPlugin } from '@/lib/tenant/scopingPlugin';

export interface IVisitor extends Document {
  _id: Types.ObjectId;
  societyId: Types.ObjectId;
  unitId: Types.ObjectId;
  visitorName: string;
  entryTime: Date;
  exitTime: Date | null;
  preApproved: boolean;
  verifiedAt: Date | null;
  verificationStatus: 'verified' | 'unverified' | 'expired' | 'wrong-unit';
  token: string | null; // Stores the token signature/string for single-use check
  createdAt: Date;
  updatedAt: Date;
}

const visitorSchema = new Schema<IVisitor>(
  {
    unitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: [true, 'Unit ID is required'],
      index: true,
    },
    visitorName: {
      type: String,
      required: [true, 'Visitor name is required'],
      trim: true,
    },
    entryTime: {
      type: Date,
      required: [true, 'Entry time is required'],
      index: true,
    },
    exitTime: {
      type: Date,
      default: null,
      index: true,
    },
    preApproved: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verificationStatus: {
      type: String,
      enum: ['verified', 'unverified', 'expired', 'wrong-unit'],
      default: 'unverified',
    },
    token: {
      type: String,
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

// Apply tenant scoping plugin - scoping boundary checks
visitorSchema.plugin(tenantScopingPlugin);

// Unique sparse index on token to prevent concurrent scan race conditions (single-use QR token validation)
visitorSchema.index({ token: 1 }, { unique: true, sparse: true });

const Visitor: Model<IVisitor> =
  mongoose.models.Visitor || mongoose.model<IVisitor>('Visitor', visitorSchema);

export default Visitor;
