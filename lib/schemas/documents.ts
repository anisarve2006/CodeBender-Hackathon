import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  circleId: z.string().uuid(),
  kind: z.enum(['prescription', 'lab_report', 'scan', 'discharge_summary', 'insurance', 'bill', 'other']),
  title: z.string().min(2, 'Document title is required').max(120),
  blobPathname: z.string().min(1, 'File path is required'),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/heic']),
  sizeBytes: z.number().int().max(10485760, 'File must not exceed 10 MB'),
  checksumSha256: z.string().min(64).max(64),
  reportDate: z.string().optional(),
  sensitivity: z.enum(['normal', 'restricted']).default('normal'),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
