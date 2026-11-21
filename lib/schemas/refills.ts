import { z } from 'zod';

/**
 * Refill schemas (shared by client forms and server actions).
 * Owner: Member B
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date format YYYY-MM-DD');

export const markRefillOrderedSchema = z.object({
  circleId: z.string().uuid(),
  refillId: z.string().uuid(),
});

export const markRefillRefilledSchema = z.object({
  circleId: z.string().uuid(),
  refillId: z.string().uuid(),
  newQuantity: z.coerce
    .number({ error: 'Enter the new quantity' })
    .int('Enter a whole number')
    .positive('Quantity must be at least 1'),
  refilledOn: isoDate.optional(),
});

export type MarkRefillOrderedInput = z.infer<typeof markRefillOrderedSchema>;
export type MarkRefillRefilledInput = z.infer<typeof markRefillRefilledSchema>;
