import { z } from 'zod';

export const createWatchmanSchema = z.object({
  email: z.string().email('Invalid email format').trim().toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one digit')
    .regex(
      /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
      'Password must contain at least one special character'
    ),
  name: z.string().min(1, 'Name is required').max(100).trim(),
  phone: z
    .string()
    .regex(/^[+]?[\d\s-]{7,15}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
});

export const approveResidentSchema = z.object({
  approved: z.boolean(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  phone: z
    .string()
    .regex(/^[+]?[\d\s-]{7,15}$/)
    .optional()
    .or(z.literal('')),
  status: z.enum(['active', 'deactivated']).optional(),
  unitId: z.string().optional(),
});

export type CreateWatchmanInput = z.infer<typeof createWatchmanSchema>;
export type ApproveResidentInput = z.infer<typeof approveResidentSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
