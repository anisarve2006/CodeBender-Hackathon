import { pgTable, uuid, text, timestamp, index, check } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { apptStatusEnum, sensitivityLevelEnum } from './enums';
import { careCircles } from './circles';
import { users } from './auth';

export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    doctorName: text('doctor_name'),
    specialty: text('specialty'),
    location: text('location'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    status: apptStatusEnum('status').default('scheduled').notNull(),
    accompaniedBy: uuid('accompanied_by').references(() => users.id, { onDelete: 'set null' }),
    notes: text('notes'),
    sensitivity: sensitivityLevelEnum('sensitivity').default('normal').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('appointments_circle_starts_idx').on(table.circleId, table.startsAt),
    check('ends_at_after_starts_at', sql`${table.endsAt} > ${table.startsAt}`),
  ],
);

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  circle: one(careCircles, {
    fields: [appointments.circleId],
    references: [careCircles.id],
  }),
  companion: one(users, {
    fields: [appointments.accompaniedBy],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [appointments.createdBy],
    references: [users.id],
  }),
}));

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
