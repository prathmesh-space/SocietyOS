import { z } from 'zod';

export const generateBillsSchema = z.object({
  billingPeriod: z.string().regex(/^\d{4}-\d{2}$/, 'Billing period must be YYYY-MM'),
  dueDate: z.preprocess(
    (val) => (typeof val === 'string' || val instanceof Date ? new Date(val) : val),
    z.date({ invalid_type_error: 'Due date must be a valid Date' } as any)
  ),
  overrides: z
    .array(
      z.object({
        unitId: z.string().min(1, 'Unit ID is required'),
        amount: z.number().min(0, 'Override amount must be non-negative'),
      })
    )
    .optional()
    .default([]),
});

export type GenerateBillsInput = z.infer<typeof generateBillsSchema>;
