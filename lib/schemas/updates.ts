import { z } from 'zod';

export const createUpdateSchema = z.object({
  circleId: z.string().uuid(),
  body: z.string().min(2, 'Update message cannot be empty').max(2000),
  moodTag: z.string().max(50).optional(),
});

export type CreateUpdateInput = z.infer<typeof createUpdateSchema>;
