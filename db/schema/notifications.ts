import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { notificationChannelEnum, reminderKindEnum } from './enums';
import { careCircles } from './circles';
import { users } from './auth';

export const reminders = pgTable(
  'reminders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircles.id, { onDelete: 'cascade' }),
    targetUserId: uuid('target_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: reminderKindEnum('kind').notNull(),
    channel: notificationChannelEnum('channel').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    remindAt: timestamp('remind_at', { withTimezone: true }).notNull(),
    payload: jsonb('payload').default({}),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    attemptCount: integer('attempt_count').default(0).notNull(),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('reminders_remind_at_pending_idx')
      .on(table.remindAt)
      .where(sql`sent_at IS NULL`),
    uniqueIndex('reminders_kind_entity_user_channel_time_idx').on(
      table.kind,
      table.entityId,
      table.targetUserId,
      table.channel,
      table.remindAt,
    ),
  ],
);

export const remindersRelations = relations(reminders, ({ one }) => ({
  circle: one(careCircles, {
    fields: [reminders.circleId],
    references: [careCircles.id],
  }),
  targetUser: one(users, {
    fields: [reminders.targetUserId],
    references: [users.id],
  }),
}));

export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;
