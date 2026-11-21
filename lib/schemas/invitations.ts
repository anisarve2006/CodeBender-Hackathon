import { z } from 'zod';

export const createInvitationSchema = z.object({
  circleId: z.string().uuid(),
  email: z.string().email('Please enter a valid email address').toLowerCase(),
  role: z.enum(['owner', 'coordinator', 'caregiver', 'viewer', 'care_recipient']),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(32, 'Invalid invitation token'),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
