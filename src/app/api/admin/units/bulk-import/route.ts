import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Unit from '@/models/Unit';
import { withAuth } from '@/lib/auth/middleware';
import { bulkImportUnitsSchema } from '@/lib/validation/unit';
import { logBulkAuditEvent } from '@/lib/audit/logger';

// POST /api/admin/units/bulk-import — Bulk import units
export const POST = withAuth(
  async (req, { auth }) => {
    try {
      const body = await req.json();
      const validation = bulkImportUnitsSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      await dbConnect();

      const { units: unitData } = validation.data;

      // Add societyId to each unit
      const unitsToCreate = unitData.map((u) => ({
        ...u,
        societyId: auth.societyId,
      }));

      // Use insertMany with ordered: false to continue on individual failures
      const results = {
        created: [] as string[],
        failed: [] as { unitNumber: string; error: string }[],
      };

      try {
        const created = await Unit.insertMany(unitsToCreate, {
          ordered: false,
          rawResult: false,
        });
        results.created = created.map((u) => u.unitNumber);
      } catch (error) {
        // insertMany with ordered:false throws but still inserts valid docs
        const bulkError = error as {
          insertedDocs?: Array<{ unitNumber: string }>;
          writeErrors?: Array<{
            err?: { errmsg?: string };
            index: number;
          }>;
        };

        if (bulkError.insertedDocs) {
          results.created = bulkError.insertedDocs.map((d) => d.unitNumber);
        }

        if (bulkError.writeErrors) {
          for (const writeErr of bulkError.writeErrors) {
            const unit = unitData[writeErr.index];
            results.failed.push({
              unitNumber: unit?.unitNumber ?? `index-${writeErr.index}`,
              error: writeErr.err?.errmsg?.includes('duplicate key')
                ? 'Unit number already exists'
                : 'Failed to create',
            });
          }
        }
      }

      // Audit log the bulk operation
      if (results.created.length > 0) {
        await logBulkAuditEvent({
          action: 'unit.bulk_import',
          entityType: 'Unit',
          affectedIds: results.created,
          metadata: {
            totalAttempted: unitData.length,
            totalCreated: results.created.length,
            totalFailed: results.failed.length,
          },
        });
      }

      return NextResponse.json(
        {
          message: `${results.created.length} units created, ${results.failed.length} failed`,
          results,
        },
        { status: results.failed.length > 0 ? 207 : 201 }
      );
    } catch (error) {
      console.error('[Admin:BulkImport] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin'] }
);
