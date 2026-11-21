import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { taskCategoryEnum, taskPriorityEnum, taskStatusEnum } from './enums';
import { careCircles } from './circles';
import { users } from './auth';

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    category: taskCategoryEnum('category').default('other').notNull(),
    priority: taskPriorityEnum('priority').default('normal').notNull(),
    status: taskStatusEnum('status').default('todo').notNull(),
    dueAt: timestamp('due_at', { withTimezone: true }),
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    completedBy: uuid('completed_by').references(() => users.id, { onDelete: 'set null' }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    linkedEntityType: text('linked_entity_type'),
    linkedEntityId: uuid('linked_entity_id'),
    recurrenceRule: text('recurrence_rule'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('tasks_circle_due_idx')
      .on(table.circleId, table.dueAt)
      .where(sql`status IN ('todo', 'in_progress') AND deleted_at IS NULL`),
    index('tasks_assigned_to_idx').on(table.assignedTo),
  ],
);

export const taskComments = pgTable('task_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  circleId: uuid('circle_id')
    .notNull()
    .references(() => careCircles.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  circle: one(careCircles, {
    fields: [tasks.circleId],
    references: [careCircles.id],
  }),
  assignee: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
  }),
  completer: one(users, {
    fields: [tasks.completedBy],
    references: [users.id],
  }),
  comments: many(taskComments),
}));

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskComments.taskId],
    references: [tasks.id],
  }),
  author: one(users, {
    fields: [taskComments.authorId],
    references: [users.id],
  }),
}));

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskComment = typeof taskComments.$inferSelect;
export type NewTaskComment = typeof taskComments.$inferInsert;
