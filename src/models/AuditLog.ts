import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { tenantScopingPlugin } from '@/lib/tenant/scopingPlugin';

// --- Audit Action Types ---

export const AUDIT_ACTIONS = [
  'society.create',
  'society.update',
  'society.deactivate',
  'unit.create',
  'unit.update',
  'unit.delete',
  'unit.bulk_import',
  'user.approve',
  'user.create',
  'user.deactivate',
  'user.update',
  'bill.generate',
  'bill.update',
  'bill.late_fee_applied',
  'payment.received',
  'complaint.create',
  'complaint.update',
  'complaint.resolve',
  'complaint.close',
  'complaint.assign',
  'visitor.manual_entry',
  'visitor.pre_approve',
  'notice.create',
  'notice.update',
  'notice.delete',
  'settings.update',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// --- Entity Types ---

export const ENTITY_TYPES = [
  'Society',
  'User',
  'Unit',
  'MaintenanceBill',
  'Payment',
  'Complaint',
  'Visitor',
  'Notice',
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

// --- AuditLog Interface ---

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  societyId: Types.ObjectId;
  actorId: Types.ObjectId;
  action: AuditAction;
  entityType: EntityType;
  entityId: Types.ObjectId;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  metadata: Record<string, unknown>; // Extra context (e.g., bulk count)
  timestamp: Date;
}

// --- Schema ---

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
    },
    entityType: {
      type: String,
      enum: ENTITY_TYPES,
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    beforeState: {
      type: Schema.Types.Mixed,
      default: null,
    },
    afterState: {
      type: Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    // No timestamps: true — we use our own immutable timestamp
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Apply tenant scoping
auditLogSchema.plugin(tenantScopingPlugin);

// Indexes for efficient querying
auditLogSchema.index({ societyId: 1, timestamp: -1 });
auditLogSchema.index({ societyId: 1, actorId: 1, timestamp: -1 });
auditLogSchema.index({ societyId: 1, entityType: 1, timestamp: -1 });

// CRITICAL: Remove update and delete operations at the schema level
// AuditLog is append-only — enforced here, not just by convention
auditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('AuditLog entries cannot be updated.');
});

auditLogSchema.pre('updateOne', function () {
  throw new Error('AuditLog entries cannot be updated.');
});

auditLogSchema.pre('updateMany', function () {
  throw new Error('AuditLog entries cannot be updated.');
});

auditLogSchema.pre('findOneAndDelete', function () {
  throw new Error('AuditLog entries cannot be deleted.');
});

auditLogSchema.pre('deleteOne', function () {
  throw new Error('AuditLog entries cannot be deleted.');
});

auditLogSchema.pre('deleteMany', function () {
  throw new Error('AuditLog entries cannot be deleted.');
});

if (process.env.NODE_ENV !== 'production') {
  delete mongoose.models.AuditLog;
}

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

export default AuditLog;
