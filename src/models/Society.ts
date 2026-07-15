import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// --- Embedded Schemas ---

export interface ILateFeeRule {
  type: 'percentage' | 'flat';
  value: number;
  gracePeriodDays: number;
}

export interface IEmergencyContact {
  name: string;
  phone: string;
  role: string; // e.g., "Security", "Plumber", "Fire"
}

// --- Society Interface ---

export interface ISociety extends Document {
  _id: Types.ObjectId;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  active: boolean;
  lateFeeRule: ILateFeeRule;
  emergencyContacts: IEmergencyContact[];
  maxVisitorWindowHours: number;
  defaultBillAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

const lateFeeRuleSchema = new Schema<ILateFeeRule>(
  {
    type: {
      type: String,
      enum: ['percentage', 'flat'],
      default: 'percentage',
    },
    value: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: function (this: ILateFeeRule, v: number) {
          return this.type === 'percentage' ? v <= 100 : true;
        },
        message: 'Percentage late fee must be between 0 and 100',
      },
    },
    gracePeriodDays: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const emergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v: string) => /^[+]?[\d\s-]{7,15}$/.test(v),
        message: 'Invalid phone number format',
      },
    },
    role: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const societySchema = new Schema<ISociety>(
  {
    name: {
      type: String,
      required: [true, 'Society name is required'],
      trim: true,
      maxlength: 200,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v: string) => /^\d{6}$/.test(v),
        message: 'Pincode must be a 6-digit number',
      },
    },
    active: {
      type: Boolean,
      default: true,
    },
    lateFeeRule: {
      type: lateFeeRuleSchema,
      default: () => ({ type: 'percentage', value: 2, gracePeriodDays: 7 }),
    },
    emergencyContacts: {
      type: [emergencyContactSchema],
      default: [],
    },
    maxVisitorWindowHours: {
      type: Number,
      default: 24,
      min: 1,
      max: 72,
    },
    defaultBillAmount: {
      type: Number,
      default: 0,
      min: 0,
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

// NOTE: Society is the tenant root — it does NOT use the scoping plugin.
// All other tenant-scoped models reference Society via societyId.

const Society: Model<ISociety> =
  mongoose.models.Society || mongoose.model<ISociety>('Society', societySchema);

export default Society;
