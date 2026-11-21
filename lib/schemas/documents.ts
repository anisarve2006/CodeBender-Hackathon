import { z } from 'zod';

export const docKindSchema = z.enum([
  'prescription',
  'lab_report',
  'scan',
  'discharge_summary',
  'insurance',
  'bill',
  'other',
]);

export const sensitivitySchema = z.enum(['normal', 'restricted']);

/** Original upload contract, kept for existing references. */
export const uploadDocumentSchema = z.object({
  circleId: z.string().uuid(),
  kind: docKindSchema,
  title: z.string().min(2, 'Document title is required').max(120),
  blobPathname: z.string().min(1, 'File path is required'),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/heic']),
  sizeBytes: z.number().int().max(10485760, 'File must not exceed 10 MB'),
  checksumSha256: z.string().min(64).max(64),
  reportDate: z.string().optional(),
  sensitivity: sensitivitySchema.default('normal'),
});

/** Form fields for uploading a document (the file itself is validated separately). */
export const createDocumentSchema = z.object({
  circleId: z.string().uuid(),
  title: z.string().trim().min(2, 'Document title is required').max(120),
  kind: docKindSchema,
  reportDate: z.union([z.literal(''), z.iso.date('Enter a valid date')]).optional(),
  sensitivity: sensitivitySchema.default('normal'),
});

export const documentFilterSchema = z.object({
  kind: docKindSchema.optional(),
  search: z.string().trim().max(120).optional(),
});

export const grantRestrictedAccessSchema = z.object({
  circleId: z.string().uuid(),
  documentId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).min(1, 'Choose at least one person').max(20),
});

export const revokeRestrictedAccessSchema = z.object({
  circleId: z.string().uuid(),
  documentId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const documentViewersSchema = z.object({
  circleId: z.string().uuid(),
  documentId: z.string().uuid(),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type DocumentFilterInput = z.infer<typeof documentFilterSchema>;
export type GrantRestrictedAccessInput = z.infer<typeof grantRestrictedAccessSchema>;
export type RevokeRestrictedAccessInput = z.infer<typeof revokeRestrictedAccessSchema>;
