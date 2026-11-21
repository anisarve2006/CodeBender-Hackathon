import { z } from 'zod';

export const createTaskSchema = z.object({
  circleId: z.string().uuid(),
  title: z.string().min(2, 'Task title is required').max(120),
  description: z.string().max(1000).optional(),
  category: z.enum(['medication', 'appointment', 'errand', 'payment', 'paperwork', 'other']).default('other'),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  dueAt: z.coerce.date().optional(),
  assignedTo: z.string().uuid().optional(),
  recurrenceRule: z.enum(['daily', 'weekly', 'monthly']).optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
