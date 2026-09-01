import { z } from 'zod';

export const createBookingRequestSchema = z.object({
  itemId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5, 'Comment must be at least 5 characters'),
});
