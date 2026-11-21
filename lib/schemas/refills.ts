import { z } from 'zod';

export const recordRefillSchema = z.object({
  refillId: z.string().uuid(),
  quantityAdded: z.number().int().min(1, 'Quantity added must be at least 1'),
  refilledOn: z.string().default(() => new Date().toISOString().split('T')[0]),
});

export const updateRefillStatusSchema = z.object({
  refillId: z.string().uuid(),
  status: z.enum(['ok', 'due_soon', 'overdue', 'ordered', 'refilled']),
});

export type RecordRefillInput = z.infer<typeof recordRefillSchema>;
export type UpdateRefillStatusInput = z.infer<typeof updateRefillStatusSchema>;
