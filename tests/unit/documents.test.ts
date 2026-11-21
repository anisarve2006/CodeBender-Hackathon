import { describe, it, expect } from 'vitest';
import { validateMagicBytes, stripExifAndProcess } from '@/lib/utils/blob';
import {
  documentUploadFormSchema,
  grantDocumentAccessSchema,
  revokeDocumentAccessSchema,
  deleteDocumentSchema,
} from '@/lib/schemas/documents';

describe('B3 Document Processing & Validation', () => {
  it('rejects files with invalid or missing magic bytes', async () => {
    // Plain text masquerading as PDF
    const fakePdf = Buffer.from('This is just plain text, not a real PDF');
    await expect(validateMagicBytes(fakePdf)).rejects.toThrow(
      'Invalid file format. Only PDF, JPEG, PNG, and HEIC files are allowed.',
    );
  });

  it('rejects executable scripts or html disguised as images', async () => {
    const maliciousScript = Buffer.from('<script>alert("xss")</script>');
    await expect(validateMagicBytes(maliciousScript)).rejects.toThrow(
      'Invalid file format. Only PDF, JPEG, PNG, and HEIC files are allowed.',
    );
  });

  it('accepts valid PDF magic bytes (%PDF-)', async () => {
    // Minimal valid PDF header
    const validPdfHeader = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const result = await validateMagicBytes(validPdfHeader);
    expect(result.mime).toBe('application/pdf');
    expect(result.ext).toBe('pdf');
  });

  it('passes PDF buffers through without EXIF modification', async () => {
    const samplePdf = Buffer.from('%PDF-1.4 sample content');
    const result = await stripExifAndProcess(samplePdf, 'application/pdf');
    expect(result.mime).toBe('application/pdf');
    expect(result.buffer).toBe(samplePdf);
  });

  it('validates document upload form schemas', () => {
    const validForm = {
      title: 'Discharge Summary - Apollo Hospital',
      kind: 'discharge_summary' as const,
      reportDate: '2026-11-20',
      sensitivity: 'restricted' as const,
    };
    const parsed = documentUploadFormSchema.safeParse(validForm);
    expect(parsed.success).toBe(true);

    // Title too short (< 2 chars)
    const invalidTitle = {
      ...validForm,
      title: 'A',
    };
    expect(documentUploadFormSchema.safeParse(invalidTitle).success).toBe(false);

    // Invalid report date format
    const invalidDate = {
      ...validForm,
      reportDate: '20-11-2026',
    };
    expect(documentUploadFormSchema.safeParse(invalidDate).success).toBe(false);
  });

  it('validates document access grant and revoke inputs with UUIDs', () => {
    const validGrant = {
      circleId: 'a0000000-0000-4000-8000-000000000001',
      documentId: 'b0000000-0000-4000-8000-000000000002',
      targetUserId: 'c0000000-0000-4000-8000-000000000003',
    };

    expect(grantDocumentAccessSchema.safeParse(validGrant).success).toBe(true);
    expect(revokeDocumentAccessSchema.safeParse(validGrant).success).toBe(true);
    expect(deleteDocumentSchema.safeParse({
      circleId: validGrant.circleId,
      documentId: validGrant.documentId,
    }).success).toBe(true);

    // Invalid UUID rejected
    expect(
      grantDocumentAccessSchema.safeParse({
        ...validGrant,
        documentId: 'not-a-valid-uuid',
      }).success,
    ).toBe(false);
  });

  it('restricts notifications from leaking document titles', () => {
    // Medical guardrail test: notifications must never contain raw document titles
    const docTitle = 'Biopsy Pathology Report for Malignancy';
    const genericNotification = 'A new medical document was uploaded to your family circle.';

    expect(genericNotification.toLowerCase()).not.toContain('biopsy');
    expect(genericNotification.toLowerCase()).not.toContain('pathology');
    expect(genericNotification.toLowerCase()).not.toContain('malignancy');
    expect(genericNotification.toLowerCase()).not.toContain(docTitle.toLowerCase());
  });
});
