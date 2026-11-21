/**
 * lib/utils/blob.ts
 * Owner: Member B
 * Upload pipeline helpers for medical documents: size limit, magic-byte MIME detection,
 * SHA-256 checksum, EXIF stripping for images, private Vercel Blob storage and signed URLs.
 *
 * Note: no 'server-only' import here so the pure helpers can be unit-tested; this module
 * is only imported from server code (actions and route handlers).
 */
import { put, del, getDownloadUrl } from '@vercel/blob';
import { fileTypeFromBuffer } from 'file-type';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Signed download URLs are meant to live for 60 seconds. */
export const SIGNED_URL_TTL_SECONDS = 60;

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const EXTENSION_BY_MIME: Record<AllowedMimeType, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/heic': '.heic',
};

function isAllowedMime(mime: string): mime is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

/** True when the size is a positive integer no larger than 10 MB. */
export function validateUploadSize(size: number): boolean {
  return Number.isInteger(size) && size > 0 && size <= MAX_UPLOAD_BYTES;
}

/**
 * Detects the real file type from its magic bytes (never from the file name or the
 * browser-supplied MIME type). Returns an allowed MIME type, or null for anything else.
 */
export async function detectMimeFromBytes(bytes: Uint8Array): Promise<AllowedMimeType | null> {
  const detected = await fileTypeFromBuffer(bytes);
  if (!detected) {
    return null;
  }
  // HEIF and HEIC share the container family; both are stored as image/heic.
  const mime = detected.mime === 'image/heif' ? 'image/heic' : detected.mime;
  return isAllowedMime(mime) ? mime : null;
}

/** SHA-256 of the bytes as lowercase hex, computed with Web Crypto. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', copy);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Removes EXIF/metadata from images by re-encoding them in the same format (sharp drops
 * metadata by default; rotate() applies the EXIF orientation first). PDFs are returned unchanged.
 * Throws when an image cannot be decoded or re-encoded (for example some HEIC files with the
 * prebuilt sharp binaries); callers must treat that as a rejected upload.
 */
export async function stripImageMetadata(
  bytes: Uint8Array,
  mime: AllowedMimeType,
): Promise<Uint8Array> {
  if (mime === 'application/pdf') {
    return bytes;
  }

  const { default: sharp } = await import('sharp');
  const format = mime === 'image/jpeg' ? 'jpeg' : mime === 'image/png' ? 'png' : 'heif';
  const output = await sharp(bytes, { failOn: 'error' }).rotate().toFormat(format).toBuffer();
  return new Uint8Array(output);
}

/**
 * Builds a safe stored file name: the user's name is reduced to a plain stem and the
 * extension always matches the detected MIME type.
 */
export function buildStoredFilename(originalName: string, mime: AllowedMimeType): string {
  const base = originalName.split(/[\\/]/).pop() ?? '';
  const stem = base
    .replace(/\.[^.]*$/, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  return `${stem || 'document'}${EXTENSION_BY_MIME[mime]}`;
}

export function buildBlobPathname(circleId: string, documentId: string, filename: string): string {
  return `circle/${circleId}/${documentId}/${filename}`;
}

/** Uploads to the private Blob store. Throws on failure; nothing is stored in that case. */
export async function uploadPrivateBlob(
  pathname: string,
  bytes: Uint8Array,
  mime: AllowedMimeType,
): Promise<{ url: string; pathname: string }> {
  const result = await put(pathname, Buffer.from(bytes), {
    access: 'private',
    contentType: mime,
    addRandomSuffix: false,
  });
  return { url: result.url, pathname: result.pathname };
}

/** Removes a stored blob by its URL (used to roll back when the database write fails). */
export async function deleteBlob(url: string): Promise<void> {
  await del(url);
}

/**
 * Creates a signed download URL for a private blob, identified by the pathname stored in
 * documents.blob_pathname. Uses getDownloadUrl from @vercel/blob. The tester must confirm that
 * this helper accepts a pathname for private stores and that the URL expires in
 * SIGNED_URL_TTL_SECONDS; if not, replace only this function.
 */
export async function createSignedDocumentUrl(pathname: string): Promise<string> {
  return await getDownloadUrl(pathname);
}
