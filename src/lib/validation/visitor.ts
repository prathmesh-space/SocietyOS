import { z } from 'zod';

export const preApproveVisitorSchema = z.object({
  visitorName: z.string().min(1, 'Visitor name is required').trim(),
  startWindow: z.string().transform((val) => new Date(val)),
  endWindow: z.string().transform((val) => new Date(val)),
});

export const manualVisitorEntrySchema = z.object({
  visitorName: z.string().min(1, 'Visitor name is required').trim(),
  unitId: z.string().min(1, 'Unit ID is required'),
  entryTime: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : new Date())),
});
