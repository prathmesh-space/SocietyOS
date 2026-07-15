import { z } from 'zod';

export const createUnitSchema = z.object({
  unitNumber: z.string().min(1, 'Unit number is required').max(20).trim(),
  floor: z.number().int().optional().default(0),
  type: z.string().trim().optional().default('2BHK'),
  areaSqFt: z.number().min(0).optional().default(0),
});

export const updateUnitSchema = z.object({
  unitNumber: z.string().min(1).max(20).trim().optional(),
  floor: z.number().int().optional(),
  type: z.string().trim().optional(),
  areaSqFt: z.number().min(0).optional(),
  active: z.boolean().optional(),
});

export const bulkImportUnitsSchema = z.object({
  units: z
    .array(
      z.object({
        unitNumber: z.string().min(1).max(20).trim(),
        floor: z.number().int().optional().default(0),
        type: z.string().trim().optional().default('2BHK'),
        areaSqFt: z.number().min(0).optional().default(0),
      })
    )
    .min(1, 'At least one unit is required')
    .max(500, 'Maximum 500 units per import'),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
export type BulkImportUnitsInput = z.infer<typeof bulkImportUnitsSchema>;
