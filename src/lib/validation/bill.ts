import { z } from 'zod';

export const generateBillsSchema = z.object({
  billingPeriod: z.string().regex(/^\d{4}-\d{2}$/, 'Billing period must be YYYY-MM'),
  dueDate: z.string().transform((v) => new Date(v)),
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
