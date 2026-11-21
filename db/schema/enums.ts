import { pgEnum } from 'drizzle-orm/pg-core';

export const circleRoleEnum = pgEnum('circle_role', [
  'owner',
  'coordinator',
  'caregiver',
  'viewer',
  'care_recipient',
]);

export const sensitivityLevelEnum = pgEnum('sensitivity_level', ['normal', 'restricted']);

export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'done', 'cancelled']);

export const taskCategoryEnum = pgEnum('task_category', [
  'medication',
  'appointment',
  'errand',
  'payment',
  'paperwork',
  'other',
]);

export const taskPriorityEnum = pgEnum('task_priority', ['low', 'normal', 'high']);

export const apptStatusEnum = pgEnum('appt_status', [
  'scheduled',
  'completed',
  'missed',
  'rescheduled',
  'cancelled',
]);

export const refillStatusEnum = pgEnum('refill_status', [
  'ok',
  'due_soon',
  'overdue',
  'ordered',
  'refilled',
]);

export const docKindEnum = pgEnum('doc_kind', [
  'prescription',
  'lab_report',
  'scan',
  'discharge_summary',
  'insurance',
  'bill',
  'other',
]);

export const reminderKindEnum = pgEnum('reminder_kind', [
  'task_due',
  'appointment',
  'refill',
  'nudge',
  'digest',
  'escalation',
]);

export const notificationChannelEnum = pgEnum('notification_channel', ['email', 'push', 'in_app']);

export const tokenPurposeEnum = pgEnum('token_purpose', ['verify_email', 'reset_password']);
