import { z } from 'zod';
import { USER_ROLES } from '@/models/User';

export const signupSchema = z.object({
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
  societyId: z.string().min(1, 'Society ID is required'),
  unitId: z.string().min(1, 'Unit ID is required').optional(), // Required for residents
  role: z.enum(['resident'] as const).default('resident'), // Only residents can self-signup
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
