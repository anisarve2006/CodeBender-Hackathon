import { z } from 'zod';

/**
 * lib/schemas/tasks.ts
 * Owner: Member A
 * Task schemas shared by the client form and the server actions.
 * Role rules that depend on the viewer (caregivers assign to themselves only)
 * are expressed with caregiverAssignmentError so both sides use the same check.
 */

export const TASK_CATEGORIES = [
  'medication',
  'appointment',
  'errand',
  'payment',
  'paperwork',
  'other',
] as const;
export const TASK_PRIORITIES = ['low', 'normal', 'high'] as const;
export const RECURRENCE_RULES = ['none', 'daily', 'weekly', 'monthly'] as const;

export type ActorRole = 'owner' | 'coordinator' | 'caregiver' | 'viewer' | 'care_recipient';

const titleField = z
  .string()
  .trim()
  .min(2, 'Task title is required')
  .max(120, 'Keep the title to 120 characters or fewer.');

const descriptionField = z
  .string()
  .trim()
  .max(1000, 'Keep the description to 1000 characters or fewer.');

/** Returns an error message when a caregiver tries to assign a task to someone else. */
export function caregiverAssignmentError(
  role: ActorRole,
  userId: string,
  assignedTo: string | null | undefined,
): string | null {
  if (role === 'caregiver' && assignedTo && assignedTo !== userId) {
    return 'Caregivers can only assign tasks to themselves.';
  }
  return null;
}

export const createTaskSchema = z.object({
  circleId: z.string().uuid(),
  title: titleField,
  description: descriptionField.optional(),
  category: z.enum(TASK_CATEGORIES).default('other'),
  priority: z.enum(TASK_PRIORITIES).default('normal'),
  dueAt: z.coerce.date().optional(),
  assignedTo: z.string().uuid().nullish(),
  recurrenceRule: z.enum(RECURRENCE_RULES).default('none'),
});

/** Create schema with the caregiver self-assignment rule applied (client form). */
export function createTaskSchemaFor(role: ActorRole, userId: string) {
  return createTaskSchema.superRefine((data, ctx) => {
    const message = caregiverAssignmentError(role, userId, data.assignedTo);
    if (message) {
      ctx.addIssue({ code: 'custom', path: ['assignedTo'], message });
    }
  });
}

export const updateTaskSchema = z.object({
  circleId: z.string().uuid(),
  taskId: z.string().uuid(),
  title: titleField.optional(),
  description: descriptionField.nullish(),
  category: z.enum(TASK_CATEGORIES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueAt: z.coerce.date().nullish(),
  recurrenceRule: z.enum(RECURRENCE_RULES).optional(),
});

export const reassignTaskSchema = z.object({
  circleId: z.string().uuid(),
  taskId: z.string().uuid(),
  assignedTo: z.string().uuid().nullable(),
});

export const commentTaskSchema = z.object({
  circleId: z.string().uuid(),
  taskId: z.string().uuid(),
  body: z
    .string()
    .trim()
    .min(1, 'Write a comment before posting.')
    .max(1000, 'Keep comments to 1000 characters or fewer.'),
});

/** Used by claim, complete, nudge and the detail loader. */
export const taskRefSchema = z.object({
  circleId: z.string().uuid(),
  taskId: z.string().uuid(),
});

export const circleIdSchema = z.object({
  circleId: z.string().uuid(),
});

export const doneCursorSchema = z.object({
  circleId: z.string().uuid(),
  cursor: z
    .object({
      completedAt: z.string().min(1),
      id: z.string().uuid(),
    })
    .nullish(),
});

/**
 * Client form values. Dates stay as the wall-clock string from
 * <input type="datetime-local">; istLocalToIso converts them for the server.
 */
export const taskFormSchema = z.object({
  title: titleField,
  description: z.string().trim().max(1000, 'Keep the description to 1000 characters or fewer.'),
  category: z.enum(TASK_CATEGORIES),
  priority: z.enum(TASK_PRIORITIES),
  dueLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Pick a due date and time.'),
  assignedTo: z.string(),
  recurrenceRule: z.enum(RECURRENCE_RULES),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

const IST_OFFSET_MS = 330 * 60 * 1000; // Asia/Kolkata is UTC+05:30 with no DST.

/** Converts "YYYY-MM-DDTHH:mm" entered as India time into an ISO UTC string. */
export function istLocalToIso(local: string): string {
  return new Date(`${local}:00+05:30`).toISOString();
}

/** Default due value: tomorrow at 10:00 Asia/Kolkata, as "YYYY-MM-DDTHH:mm". */
export function defaultDueLocal(now: Date = new Date()): string {
  const istShifted = new Date(now.getTime() + IST_OFFSET_MS + 24 * 60 * 60 * 1000);
  return `${istShifted.toISOString().slice(0, 10)}T10:00`;
}
