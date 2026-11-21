import { z } from 'zod';

export const reminderSchema = z.object({
  circleId: z.string().uuid(),
  targetUserId: z.string().uuid(),
  kind: z.enum(['task_due', 'appointment', 'refill', 'nudge', 'digest', 'escalation']),
  channel: z.enum(['email', 'push', 'in_app']),
  entityType: z.string(),
  entityId: z.string().uuid(),
  remindAt: z.coerce.date(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export type ReminderInput = z.infer<typeof reminderSchema>;
