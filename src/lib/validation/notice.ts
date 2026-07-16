import { z } from 'zod';

export const createNoticeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  body: z.string().min(1, 'Body is required').trim(),
  isImportant: z.boolean().default(false).optional(),
  expiryDate: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val ? new Date(val) : null)),
});

export const updateNoticeSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  body: z.string().min(1).trim().optional(),
  isImportant: z.boolean().optional(),
  expiryDate: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val ? new Date(val) : null)),
});
