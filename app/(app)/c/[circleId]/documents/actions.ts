'use server';

/**
 * Documents actions
 * Owner: Member B
 */
import { revalidatePath } from 'next/cache';
import { createAction } from '@/lib/utils/action';
import { requireCircleRole } from '@/lib/data/circle-context';
import {
  createDocumentRow,
  grantRestrictedAccess,
  listViewers,
  revokeRestrictedAccess,
} from '@/lib/data/documents';
import {
  createDocumentSchema,
  documentViewersSchema,
  grantRestrictedAccessSchema,
  revokeRestrictedAccessSchema,
} from '@/lib/schemas/documents';
import {
  buildBlobPathname,
  buildStoredFilename,
  deleteBlob,
  detectMimeFromBytes,
  sha256Hex,
  stripImageMetadata,
  uploadPrivateBlob,
  validateUploadSize,
} from '@/lib/utils/blob';
import type { ActionResult, CircleRole } from '@/lib/types/app';

/** Roles allowed to upload documents. */
const UPLOAD_ROLES: CircleRole[] = ['owner', 'coordinator', 'caregiver'];
/** Roles allowed to grant, revoke and see viewers of restricted documents. */
const GRANT_ROLES: CircleRole[] = ['owner', 'coordinator'];

function documentsPath(circleId: string) {
  return `/c/${circleId}/documents`;
}

function timelinePath(circleId: string) {
  return `/c/${circleId}/timeline`;
}

function formText(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * Upload flow: validate fields and file, detect the real type from magic bytes, hash,
 * strip image metadata, upload to the private store, then insert the row.
 * The upload happens before the insert, so a failed upload never leaves a row behind;
 * a failed insert deletes the blob that was just stored.
 */
export async function uploadDocumentAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = createDocumentSchema.safeParse({
      circleId: formText(formData, 'circleId'),
      title: formText(formData, 'title'),
      kind: formText(formData, 'kind'),
      reportDate: formText(formData, 'reportDate'),
      sensitivity: formText(formData, 'sensitivity') ?? 'normal',
    });

    if (!parsed.success) {
      return {
        ok: false,
        error: 'Validation failed. Please check the entered fields.',
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const input = parsed.data;
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: 'Choose a file to upload.' };
    }
    if (!validateUploadSize(file.size)) {
      return { ok: false, error: 'File must not exceed 10 MB.' };
    }

    const ctx = await requireCircleRole(input.circleId, UPLOAD_ROLES);

    const original = new Uint8Array(await file.arrayBuffer());
    if (!validateUploadSize(original.byteLength)) {
      return { ok: false, error: 'File must not exceed 10 MB.' };
    }

    const mime = await detectMimeFromBytes(original);
    if (!mime) {
      return {
        ok: false,
        error: 'This file type is not allowed. Upload a PDF, JPEG, PNG or HEIC file.',
      };
    }

    let stored: Uint8Array;
    try {
      stored = await stripImageMetadata(original, mime);
    } catch {
      return {
        ok: false,
        error: 'This image could not be processed. Try a JPEG or PNG copy of the file.',
      };
    }

    const checksum = await sha256Hex(stored);
    const documentId = globalThis.crypto.randomUUID();
    const pathname = buildBlobPathname(
      input.circleId,
      documentId,
      buildStoredFilename(file.name, mime),
    );

    const blob = await uploadPrivateBlob(pathname, stored, mime);

    try {
      const row = await createDocumentRow(ctx, {
        id: documentId,
        input,
        blobPathname: blob.pathname,
        mimeType: mime,
        sizeBytes: stored.byteLength,
        checksumSha256: checksum,
      });
      revalidatePath(documentsPath(input.circleId));
      revalidatePath(timelinePath(input.circleId));
      return { ok: true, data: { id: row.id } };
    } catch (err) {
      await deleteBlob(blob.url).catch(() => undefined);
      throw err;
    }
  } catch (err: unknown) {
    console.error('Document upload error:', err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Upload failed. Please try again.',
    };
  }
}

export const grantRestrictedAccessAction = createAction(
  grantRestrictedAccessSchema,
  async (data) => {
    const ctx = await requireCircleRole(data.circleId, GRANT_ROLES);
    const granted = await grantRestrictedAccess(ctx, data.documentId, data.userIds);
    revalidatePath(documentsPath(data.circleId));
    return { granted };
  },
  { auth: 'verified' },
);

export const revokeRestrictedAccessAction = createAction(
  revokeRestrictedAccessSchema,
  async (data) => {
    const ctx = await requireCircleRole(data.circleId, GRANT_ROLES);
    await revokeRestrictedAccess(ctx, data.documentId, data.userId);
    revalidatePath(documentsPath(data.circleId));
    return { revoked: true };
  },
  { auth: 'verified' },
);

export const listDocumentViewersAction = createAction(
  documentViewersSchema,
  async (data) => listViewers(data.circleId, data.documentId),
  { auth: 'verified' },
);

