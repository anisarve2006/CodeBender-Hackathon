import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  jsonb,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { circleRoleEnum } from './enums';
import { users } from './auth';

export const careCircles = pgTable('care_circles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  consentConfirmedAt: timestamp('consent_confirmed_at', { withTimezone: true }),
  consentConfirmedBy: uuid('consent_confirmed_by').references(() => users.id),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const careRecipients = pgTable('care_recipients', {
  id: uuid('id').defaultRandom().primaryKey(),
  circleId: uuid('circle_id')
    .notNull()
    .unique()
    .references(() => careCircles.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  dateOfBirth: date('date_of_birth'),
  bloodGroup: text('blood_group'),
  allergies: text('allergies').array(),
  emergencyContact: jsonb('emergency_contact').$type<{
    name: string;
    phone: string;
    relationship: string;
  }>(),
  primaryDoctor: jsonb('primary_doctor').$type<{
    name: string;
    phone: string;
    hospital: string;
  }>(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const circleMembers = pgTable(
  'circle_members',
  {
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircles.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: circleRoleEnum('role').notNull(),
    relationship: text('relationship'),
    city: text('city'),
    invitedBy: uuid('invited_by').references(() => users.id),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.circleId, table.userId] }),
    index('circle_members_user_id_idx').on(table.userId),
  ],
);

export const invitations = pgTable('invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  circleId: uuid('circle_id')
    .notNull()
    .references(() => careCircles.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: circleRoleEnum('role').notNull(),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  invitedBy: uuid('invited_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const careCirclesRelations = relations(careCircles, ({ one, many }) => ({
  creator: one(users, {
    fields: [careCircles.createdBy],
    references: [users.id],
  }),
  recipient: one(careRecipients, {
    fields: [careCircles.id],
    references: [careRecipients.circleId],
  }),
  members: many(circleMembers),
  invitations: many(invitations),
}));

export const careRecipientsRelations = relations(careRecipients, ({ one }) => ({
  circle: one(careCircles, {
    fields: [careRecipients.circleId],
    references: [careCircles.id],
  }),
}));

export const circleMembersRelations = relations(circleMembers, ({ one }) => ({
  circle: one(careCircles, {
    fields: [circleMembers.circleId],
    references: [careCircles.id],
  }),
  user: one(users, {
    fields: [circleMembers.userId],
    references: [users.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  circle: one(careCircles, {
    fields: [invitations.circleId],
    references: [careCircles.id],
  }),
  inviter: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export type CareCircle = typeof careCircles.$inferSelect;
export type NewCareCircle = typeof careCircles.$inferInsert;
export type CareRecipient = typeof careRecipients.$inferSelect;
export type NewCareRecipient = typeof careRecipients.$inferInsert;
export type CircleMember = typeof circleMembers.$inferSelect;
export type NewCircleMember = typeof circleMembers.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
