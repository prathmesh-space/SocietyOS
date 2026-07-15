import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { tenantScopingPlugin } from '@/lib/tenant/scopingPlugin';

export interface IComplaint extends Document {
  _id: Types.ObjectId;
  societyId: Types.ObjectId;
  unitId: Types.ObjectId;
  residentId: Types.ObjectId;
  category: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  resolutionNote: string | null;
  assignedAdminId: Types.ObjectId | null;
  reopenedFromId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const complaintSchema = new Schema<IComplaint>(
  {
    unitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: [true, 'Unit ID is required'],
      index: true,
    },
    residentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Resident ID is required'],
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
    },
    resolutionNote: {
      type: String,
      default: null,
    },
    assignedAdminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    reopenedFromId: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Apply tenant scoping plugin - automatically injects societyId on queries and creation
complaintSchema.plugin(tenantScopingPlugin);

const Complaint: Model<IComplaint> =
  mongoose.models.Complaint || mongoose.model<IComplaint>('Complaint', complaintSchema);

export default Complaint;
