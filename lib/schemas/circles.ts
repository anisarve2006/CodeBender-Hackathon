import { z } from 'zod';

export const createCircleSchema = z.object({
  name: z.string().min(3, 'Circle name must be at least 3 characters').max(60),
  consentConfirmed: z.literal(true, {
    message: 'You must confirm care recipient consent under DPDP Act 2023',
  }),
  recipientFullName: z.string().min(2, 'Recipient full name is required').max(100),
  recipientDob: z.string().optional(),
  recipientBloodGroup: z.string().max(10).optional(),
  allergies: z.array(z.string()).default([]),
});

export type CreateCircleInput = z.infer<typeof createCircleSchema>;
