import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  bigserial,
  index,
} from 'drizzle-orm/pg-core';
import { relations, desc } from 'drizzle-orm';
import { careCircles } from './circles';
import { users } from './auth';

export const activityLog = pgTable(
  'activity_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircles.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    summary: text('summary').notNull(),
    diff: jsonb('diff'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('activity_log_circle_created_idx').on(table.circleId, desc(table.createdAt)),
  ],
);

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  circle: one(careCircles, {
    fields: [activityLog.circleId],
    references: [careCircles.id],
  }),
  actor: one(users, {
    fields: [activityLog.actorId],
    references: [users.id],
  }),
}));

export type ActivityLog = typeof activityLog.$inferSelect;
export type NewActivityLog = typeof activityLog.$inferInsert;
