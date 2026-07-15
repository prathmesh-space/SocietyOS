import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { tenantScopingPlugin } from '@/lib/tenant/scopingPlugin';

export interface INotice extends Document {
  _id: Types.ObjectId;
  societyId: Types.ObjectId;
  authorId: Types.ObjectId;
  title: string;
  body: string;
  expiryDate: Date | null;
  lastEditedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const noticeSchema = new Schema<INotice>(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 200,
    },
    body: {
      type: String,
      required: [true, 'Body content is required'],
      trim: true,
    },
    expiryDate: {
      type: Date,
      default: null,
      index: true,
    },
    lastEditedAt: {
      type: Date,
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

// Apply tenant scoping boundary checks
noticeSchema.plugin(tenantScopingPlugin);

const Notice: Model<INotice> =
  mongoose.models.Notice || mongoose.model<INotice>('Notice', noticeSchema);

export default Notice;
