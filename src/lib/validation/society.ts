import { z } from 'zod';

export const createSocietySchema = z.object({
  name: z.string().min(1, 'Society name is required').max(200).trim(),
  address: z.string().min(1, 'Address is required').trim(),
  city: z.string().min(1, 'City is required').trim(),
  state: z.string().min(1, 'State is required').trim(),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be a 6-digit number'),
  defaultBillAmount: z.number().min(0).optional().default(0),
  maxVisitorWindowHours: z.number().min(1).max(72).optional().default(24),
  lateFeeRule: z
    .object({
      type: z.enum(['percentage', 'flat']),
      value: z.number().min(0),
      gracePeriodDays: z.number().min(0),
    })
    .optional(),
  // First admin user for the society
  adminEmail: z.string().email('Invalid admin email').trim().toLowerCase(),
  adminName: z.string().min(1, 'Admin name is required').max(100).trim(),
  adminPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one digit')
    .regex(
      /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
      'Password must contain at least one special character'
    ),
});

export const updateSocietySchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  address: z.string().min(1).trim().optional(),
  city: z.string().min(1).trim().optional(),
  state: z.string().min(1).trim().optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  active: z.boolean().optional(),
  defaultBillAmount: z.number().min(0).optional(),
  maxVisitorWindowHours: z.number().min(1).max(72).optional(),
  lateFeeRule: z
    .object({
      type: z.enum(['percentage', 'flat']),
      value: z.number().min(0),
      gracePeriodDays: z.number().min(0),
    })
    .optional(),
  emergencyContacts: z
    .array(
      z.object({
        name: z.string().min(1).trim(),
        phone: z.string().regex(/^[+]?[\d\s-]{7,15}$/),
        role: z.string().min(1).trim(),
      })
    )
    .optional(),
});

export type CreateSocietyInput = z.infer<typeof createSocietySchema>;
export type UpdateSocietyInput = z.infer<typeof updateSocietySchema>;
