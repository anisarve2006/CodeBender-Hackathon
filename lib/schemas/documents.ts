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

export const sensitivityLevelSchema = z.enum(['normal', 'restricted']);

export const uploadDocumentSchema = z.object({
  circleId: z.string().uuid(),
  kind: docKindSchema,
  title: z.string().min(2, 'Document title is required').max(120),
  blobPathname: z.string().min(1, 'File path is required'),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/heic']),
  sizeBytes: z.number().int().max(10485760, 'File must not exceed 10 MB'),
  checksumSha256: z.string().min(64).max(64),
  reportDate: z.string().optional(),
  sensitivity: sensitivityLevelSchema.default('normal'),
});

export const documentUploadFormSchema = z.object({
  title: z.string().min(2, 'Document title must be at least 2 characters').max(120),
  kind: docKindSchema,
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Report date must be YYYY-MM-DD'),
  sensitivity: sensitivityLevelSchema,
});

export const grantDocumentAccessSchema = z.object({
  circleId: z.string().uuid('Invalid circle ID'),
  documentId: z.string().uuid('Invalid document ID'),
  targetUserId: z.string().uuid('Invalid user ID'),
});

export const revokeDocumentAccessSchema = z.object({
  circleId: z.string().uuid('Invalid circle ID'),
  documentId: z.string().uuid('Invalid document ID'),
  targetUserId: z.string().uuid('Invalid user ID'),
});

export const deleteDocumentSchema = z.object({
  circleId: z.string().uuid('Invalid circle ID'),
  documentId: z.string().uuid('Invalid document ID'),
});

export type DocKind = z.infer<typeof docKindSchema>;
export type SensitivityLevel = z.infer<typeof sensitivityLevelSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type DocumentUploadFormValues = z.infer<typeof documentUploadFormSchema>;
export type GrantDocumentAccessInput = z.infer<typeof grantDocumentAccessSchema>;
export type RevokeDocumentAccessInput = z.infer<typeof revokeDocumentAccessSchema>;
export type DeleteDocumentInput = z.infer<typeof deleteDocumentSchema>;
