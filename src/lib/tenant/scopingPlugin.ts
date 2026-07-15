import { Schema, type Query } from 'mongoose';
import { getTenantContext } from './context';

/**
 * Mongoose plugin that automatically injects `societyId` into every query
 * on a tenant-scoped collection.
 *
 * This is the technical centerpiece of SocietyOS's multi-tenant architecture.
 * Instead of relying on each route handler to remember to filter by societyId,
 * this plugin enforces it at the data layer.
 *
 * A query executed with no societyId in context (e.g., a background job)
 * must explicitly opt into "unscoped" mode — making cross-tenant access
 * an explicit, auditable decision rather than an accidental default.
 *
 * Compatible with Mongoose 9.x (no `next` callback in pre hooks).
 */
export function tenantScopingPlugin(schema: Schema): void {
  // Add societyId to the schema if not already present
  if (!schema.paths['societyId']) {
    schema.add({
      societyId: {
        type: Schema.Types.ObjectId,
        ref: 'Society',
        required: true,
        index: true,
        immutable: true, // societyId can never be changed after creation
      },
    });
  }

  // Compound index on { societyId, _id } for efficient tenant-scoped lookups
  schema.index({ societyId: 1, _id: 1 });

  // Hook into all query operations to inject societyId filter.
  // Mongoose 9.x: pre hooks do NOT receive `next`. Throw to signal errors.
  const queryHooks = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'findOneAndDelete',
    'findOneAndReplace',
    'updateOne',
    'updateMany',
    'deleteOne',
    'deleteMany',
    'countDocuments',
  ] as const;

  for (const hookName of queryHooks) {
    schema.pre(hookName, function (this: Query<unknown, unknown>) {
      const opts = ((this as any).getOptions?.() ?? (this as any).options ?? {}) as { unscoped?: boolean };

      // Allow explicit unscoped queries (background jobs, Super Admin)
      if (opts.unscoped) {
        return;
      }

      const ctx = getTenantContext();

      if (!ctx) {
        throw new Error(
          `Tenant context not set for ${hookName} query on tenant-scoped collection. ` +
          'Use runWithTenantContext() or pass { unscoped: true } for background jobs.'
        );
      }

      if (ctx.role === 'superadmin') {
        // Super Admin can query across tenants, but we still scope
        // if they have a specific societyId in context
        if (ctx.societyId) {
          this.where({ societyId: ctx.societyId });
        }
        return;
      }

      if (!ctx.societyId) {
        throw new Error(
          'societyId is required in tenant context for non-Super-Admin queries.'
        );
      }

      // Inject the societyId filter
      this.where({ societyId: ctx.societyId });
    });
  }

  // Hook into validate to ensure societyId is set from context before Mongoose validation runs
  schema.pre('validate', function () {
    if (this.isNew && !this.get('societyId')) {
      const ctx = getTenantContext();
      if (ctx?.societyId) {
        this.set('societyId', ctx.societyId);
      } else {
        throw new Error(
          'societyId must be set when creating a new document in a tenant-scoped collection.'
        );
      }
    }
  });
}
