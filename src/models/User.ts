import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { tenantScopingPlugin } from '@/lib/tenant/scopingPlugin';

// --- User Roles ---

export const USER_ROLES = ['resident', 'admin', 'watchman', 'superadmin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// --- User Status ---

export const USER_STATUSES = ['pending', 'active', 'deactivated'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

// --- User Interface ---

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  role: UserRole;
  societyId: Types.ObjectId | null;
  unitId: Types.ObjectId | null;
  name: string;
  phone: string;
  status: UserStatus;
  refreshTokenHash: string | null;
  refreshTokenFamily: string | null; // For token rotation / reuse detection
  activationToken: string | null;
  activationTokenExpires: Date | null;
  contestedUnit: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: 'Invalid email format',
      },
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Never returned in queries by default
    },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
      immutable: true, // Role cannot be changed after creation (PRD §9)
    },
    societyId: {
      type: Schema.Types.ObjectId,
      ref: 'Society',
      default: null,
      // null only for superadmin; enforced by the scoping plugin for others
      // We define it here explicitly so the scoping plugin doesn't add a duplicate
    },
    unitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      default: null,
      // Only relevant for residents
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: (v: string) => !v || /^[+]?[\d\s-]{7,15}$/.test(v),
        message: 'Invalid phone number format',
      },
    },
    status: {
      type: String,
      enum: USER_STATUSES,
      default: 'pending',
    },
    refreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    refreshTokenFamily: {
      type: String,
      default: null,
      select: false,
    },
    activationToken: {
      type: String,
      default: null,
      select: false,
    },
    activationTokenExpires: {
      type: Date,
      default: null,
      select: false,
    },
    contestedUnit: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.refreshTokenHash;
        delete ret.refreshTokenFamily;
        delete ret.activationToken;
        delete ret.activationTokenExpires;
        return ret;
      },
    },
  }
);

// The scoping plugin would normally add societyId, but we've defined it
// explicitly above since User has special handling (null for superadmin).
// We still apply the plugin for query scoping.

// Custom scoping: Don't apply the standard plugin to User since superadmin has null societyId.
// Instead, we apply a modified version that handles the null case.
const queryHooks = [
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'countDocuments',
] as const;

import { getTenantContext } from '@/lib/tenant/context';

for (const hookName of queryHooks) {
  userSchema.pre(hookName, function () {
    const opts = ((this as any).getOptions?.() ?? (this as any).options ?? {}) as { unscoped?: boolean };

    if (opts?.unscoped) {
      return;
    }

    const ctx = getTenantContext();

    if (!ctx) {
      throw new Error(
        `Tenant context not set for ${hookName} query on User collection.`
      );
    }

    // Super Admin can query across all users
    if (ctx.role === 'superadmin') {
      if (ctx.societyId) {
        this.where({ societyId: ctx.societyId });
      }
      return;
    }

    if (!ctx.societyId) {
      throw new Error('societyId is required for non-Super-Admin queries.');
    }

    this.where({ societyId: ctx.societyId });
  });
}

if (process.env.NODE_ENV !== 'production') {
  delete mongoose.models.User;
}

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User;
