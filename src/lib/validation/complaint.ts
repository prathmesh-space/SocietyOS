import { z } from 'zod';

export const createComplaintSchema = z.object({
  category: z.string().min(1, 'Category is required').trim(),
  title: z.string().min(1, 'Title is required').trim(),
  description: z.string().min(10, 'Description must be at least 10 characters long').trim(),
});

export const updateComplaintStatusSchema = z.object({
  status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed']),
  resolutionNote: z.string().trim().optional().nullable(),
});

export const assignComplaintSchema = z.object({
  assignedAdminId: z.string().min(1, 'Admin ID is required').nullable(),
});
