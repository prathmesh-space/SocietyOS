import AuditLog, { type AuditAction, type EntityType } from '@/models/AuditLog';
import { getTenantContext } from '@/lib/tenant';
import type { Types } from 'mongoose';

interface LogAuditEventParams {
  action: AuditAction;
  entityType: EntityType;
  entityId: string | Types.ObjectId;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  // Optional overrides (for cases where context might not be standard)
  actorId?: string;
  societyId?: string;
}

/**
 * Write an audit log entry.
 *
 * Reads actorId and societyId from the tenant context by default,
 * but allows explicit overrides for edge cases (e.g., system-initiated actions).
 *
 * This function is intentionally fire-and-forget — audit log writes
 * should never block the primary operation. Failures are logged to console.
 */
export async function logAuditEvent(params: LogAuditEventParams): Promise<void> {
  try {
    const ctx = getTenantContext();

    const actorId = params.actorId || ctx?.userId;
    const societyId = params.societyId || ctx?.societyId;

    if (!actorId || !societyId) {
      console.error('[AuditLog] Cannot write audit log: missing actorId or societyId', {
        action: params.action,
        entityType: params.entityType,
      });
      return;
    }

    await AuditLog.create({
      societyId,
      actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeState: params.beforeState ?? null,
      afterState: params.afterState ?? null,
      metadata: params.metadata ?? {},
      timestamp: new Date(),
    });
  } catch (error) {
    // Never throw — audit failures must not break the primary operation
    console.error('[AuditLog] Failed to write audit log:', error, {
      action: params.action,
      entityType: params.entityType,
    });
  }
}

/**
 * Log a bulk operation as a single audit entry.
 * Used for operations like bulk bill generation to avoid flooding the log.
 */
export async function logBulkAuditEvent(params: {
  action: AuditAction;
  entityType: EntityType;
  affectedIds: (string | Types.ObjectId)[];
  metadata?: Record<string, unknown>;
  actorId?: string;
  societyId?: string;
}): Promise<void> {
  const ctx = getTenantContext();
  const actorId = params.actorId || ctx?.userId;
  const societyId = params.societyId || ctx?.societyId;

  if (!actorId || !societyId) {
    console.error('[AuditLog] Cannot write bulk audit log: missing context');
    return;
  }

  try {
    // Use the first affected ID as the entityId, store all in metadata
    const primaryId = params.affectedIds[0];
    if (!primaryId) return;

    await AuditLog.create({
      societyId,
      actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: primaryId,
      beforeState: null,
      afterState: null,
      metadata: {
        ...params.metadata,
        bulkOperation: true,
        affectedCount: params.affectedIds.length,
        affectedIds: params.affectedIds,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[AuditLog] Failed to write bulk audit log:', error);
  }
}
