import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations, desc } from 'drizzle-orm';
import { careCircles } from './circles';
import { users } from './auth';

export const updates = pgTable(
  'updates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircles.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    body: text('body').notNull(),
    moodTag: text('mood_tag'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('updates_circle_created_idx').on(table.circleId, desc(table.createdAt)),
  ],
);

export const updatesRelations = relations(updates, ({ one }) => ({
  circle: one(careCircles, {
    fields: [updates.circleId],
    references: [careCircles.id],
  }),
  author: one(users, {
    fields: [updates.authorId],
    references: [users.id],
  }),
}));

export type Update = typeof updates.$inferSelect;
export type NewUpdate = typeof updates.$inferInsert;
