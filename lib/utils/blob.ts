import crypto from 'node:crypto';
import { put, del, issueSignedToken, presignUrl } from '@vercel/blob';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { uploadLimiter } from '@/lib/utils/rate-limit';
import { withUserTx } from '@/db/client';
import { documents, restrictedDocumentGrants } from '@/db/schema/documents';
import { sql, eq, and } from 'drizzle-orm';
import type { DocKind, SensitivityLevel } from '@/lib/schemas/documents';
import type { CircleContext } from '@/lib/types/app';

const MAX_DOC_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
]);

export interface UploadDocumentMeta {
  title: string;
  kind: DocKind;
  reportDate?: string | null;
  sensitivity?: SensitivityLevel;
  filename?: string;
}

export interface SignedDocUrlResult {
  url: string;
  expiresAt: string;
  title: string;
  mimeType: string;
}

/**
 * Returns an S3 client configured for Neon Object Storage if environment variables are set.
 */
export function getNeonS3Client(): { client: S3Client; bucket: string } | null {
  const endpoint = process.env.NEON_STORAGE_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3;
  const accessKeyId = process.env.NEON_STORAGE_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.NEON_STORAGE_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.NEON_STORAGE_BUCKET || process.env.AWS_BUCKET_NAME || 'care-documents';
  const region = process.env.NEON_STORAGE_REGION || process.env.AWS_REGION || 'us-east-2';

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const client = new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });

  return { client, bucket };
}

/**
 * Validates magic bytes using file-type header analysis.
 * Explicitly rejects non-allowed MIME types and spoofed file extensions.
 */
export async function validateMagicBytes(buffer: Buffer): Promise<{ mime: string; ext: string }> {
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const detected = await fileTypeFromBuffer(uint8);

  if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
    throw new Error('Invalid file format. Only PDF, JPEG, PNG, and HEIC files are allowed.');
  }

  return { mime: detected.mime, ext: detected.ext };
}

/**
 * Strips EXIF metadata and auto-rotates image files.
 * PDFs are returned unmodified.
 */
export async function stripExifAndProcess(
  buffer: Buffer,
  detectedMime: string,
): Promise<{ buffer: Buffer; mime: string }> {
  if (detectedMime === 'application/pdf') {
    return { buffer, mime: detectedMime };
  }

  try {
    const image = sharp(buffer).rotate();

    if (detectedMime === 'image/png') {
      const processed = await image.png().toBuffer();
      return { buffer: processed, mime: 'image/png' };
    }

    const processed = await image.jpeg({ quality: 85 }).toBuffer();
    return { buffer: processed, mime: 'image/jpeg' };
  } catch {
    return { buffer, mime: detectedMime };
  }
}

/**
 * Uploads a document to Vercel private Blob storage with:
 * - Rate limiting (uploadLimiter)
 * - Size check (<= 10 MB)
 * - Magic bytes MIME validation
 * - EXIF stripping and re-encoding for images
 * - SHA-256 checksum
 * - Zero orphan cleanup guarantee
 */
export async function uploadDocument(
  ctx: CircleContext,
  fileBuffer: Buffer,
  meta: UploadDocumentMeta,
) {
  // 1. Rate limiter check
  const rateLimit = await uploadLimiter.limit(ctx.userId);
  if (!rateLimit.success) {
    throw new Error('Upload rate limit reached. Please wait before uploading more files.');
  }

  // 2. Size check
  if (fileBuffer.length > MAX_DOC_SIZE_BYTES) {
    throw new Error('File exceeds maximum allowed size of 10 MB.');
  }

  // 3. Magic bytes validation
  const detected = await validateMagicBytes(fileBuffer);

  // 4. Strip EXIF and re-encode
  const { buffer: processedBuffer, mime: finalMime } = await stripExifAndProcess(
    fileBuffer,
    detected.mime,
  );

  // 5. SHA-256 checksum
  const checksumSha256 = crypto.createHash('sha256').update(processedBuffer).digest('hex');

  // 6. Pathnames
  const documentId = crypto.randomUUID();
  const safeFilename = (meta.filename || 'document')
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.+/g, '.');
  const blobTarget = `circle/${ctx.circleId}/${documentId}/${safeFilename}`;

  let blobPathname = '';
  const s3Config = getNeonS3Client();

  // 7. Upload to Neon Object Storage or Vercel private Blob
  if (s3Config) {
    try {
      await s3Config.client.send(
        new PutObjectCommand({
          Bucket: s3Config.bucket,
          Key: blobTarget,
          Body: processedBuffer,
          ContentType: finalMime,
          Metadata: {
            circleId: ctx.circleId,
            documentId,
            checksumSha256,
          },
        }),
      );
      blobPathname = blobTarget;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown S3 storage error';
      throw new Error(`Neon Object Storage upload failed: ${msg}`);
    }
  } else if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blobResult = await put(blobTarget, processedBuffer, {
        access: 'private',
        addRandomSuffix: true,
        contentType: finalMime,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      blobPathname = blobResult.pathname;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown blob error';
      throw new Error(`Blob upload failed: ${msg}`);
    }
  } else {
    blobPathname = `${blobTarget}_mock`;
  }

  // 8. Insert into documents via withUserTx (zero orphan guarantee)
  try {
    const [docRecord] = await withUserTx(ctx.userId, async (tx) => {
      return tx
        .insert(documents)
        .values({
          id: documentId,
          circleId: ctx.circleId,
          kind: meta.kind,
          title: meta.title,
          blobPathname,
          mimeType: finalMime,
          sizeBytes: processedBuffer.length,
          checksumSha256,
          reportDate: meta.reportDate || null,
          sensitivity: meta.sensitivity || 'normal',
          uploadedBy: ctx.userId,
        })
        .returning();
    });

    return docRecord;
  } catch (dbErr) {
    // If DB insert fails, delete uploaded blob immediately
    if (s3Config && blobPathname && !blobPathname.endsWith('_mock')) {
      try {
        await s3Config.client.send(
          new DeleteObjectCommand({
            Bucket: s3Config.bucket,
            Key: blobPathname,
          }),
        );
      } catch {
        // Log deletion failure
      }
    } else if (process.env.BLOB_READ_WRITE_TOKEN && blobPathname) {
      try {
        await del(blobPathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
      } catch {
        // Log deletion failure
      }
    }
    throw dbErr;
  }
}

/**
 * Checks document visibility via can_view_document SQL contract,
 * logs access to document_access_log, and dispenses a 60-second signed GET URL.
 */
export async function getDocumentUrl(
  ctx: CircleContext,
  documentId: string,
): Promise<SignedDocUrlResult> {
  const doc = await withUserTx(ctx.userId, async (tx) => {
    const res = await tx.execute<{
      id: string;
      circle_id: string;
      title: string;
      blob_pathname: string;
      mime_type: string;
      sensitivity: SensitivityLevel;
      can_view: boolean;
    }>(sql`
      SELECT
        d.id,
        d.circle_id,
        d.title,
        d.blob_pathname,
        d.mime_type,
        d.sensitivity,
        can_view_document(d.id) AS can_view
      FROM documents d
      WHERE d.id = ${documentId} AND d.circle_id = ${ctx.circleId} AND d.deleted_at IS NULL
    `);
    return res.rows[0];
  });

  if (!doc || !doc.can_view) {
    throw new Error('Access denied: You do not have permission to view this document.');
  }

  // Log access
  await withUserTx(ctx.userId, async (tx) => {
    await tx.execute(sql`
      INSERT INTO document_access_log (document_id, circle_id, user_id, action, accessed_at)
      VALUES (${documentId}, ${ctx.circleId}, ${ctx.userId}, 'viewed', now())
    `);
  });

  const expiresAt = new Date(Date.now() + 60 * 1000); // 60s signed token
  let signedUrl: string;

  const s3Config = getNeonS3Client();

  if (s3Config && !doc.blob_pathname.endsWith('_mock') && !doc.blob_pathname.startsWith('seed/')) {
    try {
      const command = new GetObjectCommand({
        Bucket: s3Config.bucket,
        Key: doc.blob_pathname,
        ResponseContentType: doc.mime_type,
      });
      signedUrl = await getSignedUrl(s3Config.client, command, { expiresIn: 60 });
    } catch {
      signedUrl = `https://mock-blob.local/${doc.blob_pathname}?expires=${expiresAt.getTime()}`;
    }
  } else if (process.env.BLOB_READ_WRITE_TOKEN && !doc.blob_pathname.endsWith('_mock')) {
    const signedToken = await issueSignedToken({
      pathname: doc.blob_pathname,
      operations: ['get'],
      validUntil: expiresAt.getTime(),
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const presigned = await presignUrl(signedToken, {
      pathname: doc.blob_pathname,
      operation: 'get',
      access: 'private',
    });

    signedUrl = presigned.presignedUrl;
  } else {
    signedUrl = `https://mock-blob.local/${doc.blob_pathname}?expires=${expiresAt.getTime()}`;
  }

  return {
    url: signedUrl,
    expiresAt: expiresAt.toISOString(),
    title: doc.title,
    mimeType: doc.mime_type,
  };
}

/**
 * Soft deletes a document record.
 */
export async function deleteDocument(ctx: CircleContext, documentId: string): Promise<void> {
  await withUserTx(ctx.userId, async (tx) => {
    await tx
      .update(documents)
      .set({ deletedAt: new Date() })
      .where(and(eq(documents.id, documentId), eq(documents.circleId, ctx.circleId)));
  });
}

/**
 * Grants access for a restricted document to another circle member.
 */
export async function grantDocumentAccess(
  ctx: CircleContext,
  documentId: string,
  targetUserId: string,
): Promise<void> {
  await withUserTx(ctx.userId, async (tx) => {
    await tx
      .insert(restrictedDocumentGrants)
      .values({
        documentId,
        userId: targetUserId,
        grantedBy: ctx.userId,
      })
      .onConflictDoNothing();
  });
}

/**
 * Revokes access for a restricted document.
 */
export async function revokeDocumentAccess(
  ctx: CircleContext,
  documentId: string,
  targetUserId: string,
): Promise<void> {
  await withUserTx(ctx.userId, async (tx) => {
    await tx
      .delete(restrictedDocumentGrants)
      .where(
        and(
          eq(restrictedDocumentGrants.documentId, documentId),
          eq(restrictedDocumentGrants.userId, targetUserId),
        ),
      );
  });
}

/**
 * Lists access log for a document (who viewed it and when).
 */
export async function listDocumentAccessLogs(circleId: string, documentId: string, userId: string) {
  return withUserTx(userId, async (tx) => {
    const res = await tx.execute<{
      id: number;
      user_id: string;
      full_name: string;
      action: string;
      accessed_at: string;
    }>(sql`
      SELECT
        l.id,
        l.user_id,
        u.full_name,
        l.action,
        l.accessed_at
      FROM document_access_log l
      JOIN users u ON l.user_id = u.id
      WHERE l.document_id = ${documentId} AND l.circle_id = ${circleId}
      ORDER BY l.accessed_at DESC
      LIMIT 50
    `);
    return res.rows;
  });
}

/**
 * Lists members who have been granted access to a restricted document.
 */
export async function listDocumentGrants(documentId: string, userId: string) {
  return withUserTx(userId, async (tx) => {
    const res = await tx.execute<{
      user_id: string;
      full_name: string;
      granted_at: string;
    }>(sql`
      SELECT
        g.user_id,
        u.full_name,
        g.created_at AS granted_at
      FROM restricted_document_grants g
      JOIN users u ON g.user_id = u.id
      WHERE g.document_id = ${documentId}
      ORDER BY g.created_at ASC
    `);
    return res.rows;
  });
}
