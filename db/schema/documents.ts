import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  integer,
  bigserial,
  primaryKey,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { docKindEnum, sensitivityLevelEnum } from './enums';
import { careCircles } from './circles';
import { users } from './auth';

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircles.id, { onDelete: 'cascade' }),
    kind: docKindEnum('kind').default('other').notNull(),
    title: text('title').notNull(),
    blobPathname: text('blob_pathname').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    checksumSha256: text('checksum_sha256').notNull(),
    reportDate: date('report_date'),
    sensitivity: sensitivityLevelEnum('sensitivity').default('normal').notNull(),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    check('doc_size_max_10mb', sql`${table.sizeBytes} <= 10485760`),
  ],
);

export const restrictedDocumentGrants = pgTable(
  'restricted_document_grants',
  {
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    grantedBy: uuid('granted_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.documentId, table.userId] }),
  ],
);

export const documentAccessLog = pgTable('document_access_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  circleId: uuid('circle_id')
    .notNull()
    .references(() => careCircles.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  action: text('action').default('viewed').notNull(),
  accessedAt: timestamp('accessed_at', { withTimezone: true }).defaultNow().notNull(),
});

export const documentsRelations = relations(documents, ({ one, many }) => ({
  circle: one(careCircles, {
    fields: [documents.circleId],
    references: [careCircles.id],
  }),
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
  grants: many(restrictedDocumentGrants),
  accessLogs: many(documentAccessLog),
}));

export const restrictedDocumentGrantsRelations = relations(
  restrictedDocumentGrants,
  ({ one }) => ({
    document: one(documents, {
      fields: [restrictedDocumentGrants.documentId],
      references: [documents.id],
    }),
    user: one(users, {
      fields: [restrictedDocumentGrants.userId],
      references: [users.id],
    }),
    grantor: one(users, {
      fields: [restrictedDocumentGrants.grantedBy],
      references: [users.id],
    }),
  }),
);

export const documentAccessLogRelations = relations(documentAccessLog, ({ one }) => ({
  document: one(documents, {
    fields: [documentAccessLog.documentId],
    references: [documents.id],
  }),
  circle: one(careCircles, {
    fields: [documentAccessLog.circleId],
    references: [careCircles.id],
  }),
  user: one(users, {
    fields: [documentAccessLog.userId],
    references: [users.id],
  }),
}));

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type RestrictedDocumentGrant = typeof restrictedDocumentGrants.$inferSelect;
export type NewRestrictedDocumentGrant = typeof restrictedDocumentGrants.$inferInsert;
export type DocumentAccessLog = typeof documentAccessLog.$inferSelect;
export type NewDocumentAccessLog = typeof documentAccessLog.$inferInsert;
