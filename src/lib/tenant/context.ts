import { AsyncLocalStorage } from 'async_hooks';
import type { Types } from 'mongoose';

/**
 * Tenant context stored per-request via AsyncLocalStorage.
 * This is the single source of truth for "who is making this request"
 * and "which society's data should they see."
 */
export interface TenantContext {
  userId: string;
  role: 'resident' | 'admin' | 'watchman' | 'superadmin';
  societyId: string | null; // null only for Super Admin
}

// The AsyncLocalStorage instance — one per process
const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Run a function within a tenant context.
 * All database queries inside `fn` will automatically be scoped
 * to the given societyId via the Mongoose scoping plugin.
 */
export function runWithTenantContext<T>(
  context: TenantContext,
  fn: () => T
): T {
  return tenantStorage.run(context, fn);
}

/**
 * Get the current tenant context.
 * Returns undefined if called outside a request scope
 * (e.g., in a background job that hasn't set context).
 */
export function getTenantContext(): TenantContext | undefined {
  return tenantStorage.getStore();
}

/**
 * Get the current societyId or throw if not available.
 * Used by the scoping plugin — ensures we never accidentally
 * run an unscoped query.
 */
export function requireSocietyId(): string {
  const ctx = getTenantContext();
  if (!ctx) {
    throw new Error(
      'Tenant context not set. Use runWithTenantContext() or explicitly opt into unscoped mode.'
    );
  }
  if (!ctx.societyId) {
    throw new Error(
      'societyId is null (Super Admin context). Use { unscoped: true } for cross-tenant queries.'
    );
  }
  return ctx.societyId;
}

/**
 * Helper to check if the current context is a Super Admin.
 */
export function isSuperAdmin(): boolean {
  const ctx = getTenantContext();
  return ctx?.role === 'superadmin';
}

export { tenantStorage };
