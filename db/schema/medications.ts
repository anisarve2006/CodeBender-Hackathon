import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  boolean,
  integer,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { refillStatusEnum } from './enums';
import { careCircles } from './circles';
import { users } from './auth';

export const prescriptions = pgTable('prescriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  circleId: uuid('circle_id')
    .notNull()
    .references(() => careCircles.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id'),
  prescribedOn: date('prescribed_on').notNull(),
  doctorName: text('doctor_name'),
  notes: text('notes'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const medications = pgTable('medications', {
  id: uuid('id').defaultRandom().primaryKey(),
  circleId: uuid('circle_id')
    .notNull()
    .references(() => careCircles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  strength: text('strength'),
  form: text('form'),
  instructionsAsWritten: text('instructions_as_written').notNull(),
  prescribedBy: text('prescribed_by'),
  prescriptionId: uuid('prescription_id').references(() => prescriptions.id, { onDelete: 'set null' }),
  startDate: date('start_date'),
  endDate: date('end_date'),
  isActive: boolean('is_active').default(true).notNull(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const refills = pgTable(
  'refills',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircles.id, { onDelete: 'cascade' }),
    medicationId: uuid('medication_id')
      .notNull()
      .references(() => medications.id, { onDelete: 'cascade' }),
    quantityOnHand: integer('quantity_on_hand').default(0).notNull(),
    dailyUsage: integer('daily_usage').default(1).notNull(),
    lastRefilledOn: date('last_refilled_on'),
    nextRefillDue: date('next_refill_due'),
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    status: refillStatusEnum('status').default('ok').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('refills_circle_due_idx').on(table.circleId, table.nextRefillDue),
    check('quantity_on_hand_non_negative', sql`${table.quantityOnHand} >= 0`),
    check('daily_usage_positive', sql`${table.dailyUsage} > 0`),
  ],
);

export const prescriptionsRelations = relations(prescriptions, ({ one, many }) => ({
  circle: one(careCircles, {
    fields: [prescriptions.circleId],
    references: [careCircles.id],
  }),
  medications: many(medications),
  creator: one(users, {
    fields: [prescriptions.createdBy],
    references: [users.id],
  }),
}));

export const medicationsRelations = relations(medications, ({ one, many }) => ({
  circle: one(careCircles, {
    fields: [medications.circleId],
    references: [careCircles.id],
  }),
  prescription: one(prescriptions, {
    fields: [medications.prescriptionId],
    references: [prescriptions.id],
  }),
  refills: many(refills),
  creator: one(users, {
    fields: [medications.createdBy],
    references: [users.id],
  }),
}));

export const refillsRelations = relations(refills, ({ one }) => ({
  circle: one(careCircles, {
    fields: [refills.circleId],
    references: [careCircles.id],
  }),
  medication: one(medications, {
    fields: [refills.medicationId],
    references: [medications.id],
  }),
  assignee: one(users, {
    fields: [refills.assignedTo],
    references: [users.id],
  }),
}));

export type Prescription = typeof prescriptions.$inferSelect;
export type NewPrescription = typeof prescriptions.$inferInsert;
export type Medication = typeof medications.$inferSelect;
export type NewMedication = typeof medications.$inferInsert;
export type Refill = typeof refills.$inferSelect;
export type NewRefill = typeof refills.$inferInsert;
