import { withUserTx } from '@/db/client';
import { bumpCircleVersion } from '@/lib/live/version';
import { sql } from 'drizzle-orm';
import {
  uploadDocument as uploadDocBlob,
  getDocumentUrl as getDocUrlBlob,
  deleteDocument as deleteDocBlob,
  grantDocumentAccess as grantDocBlob,
  revokeDocumentAccess as revokeDocBlob,
  listDocumentAccessLogs as listLogsBlob,
  listDocumentGrants as listGrantsBlob,
  type UploadDocumentMeta,
  type SignedDocUrlResult,
} from '@/lib/utils/blob';
import type { CircleContext } from '@/lib/types/app';
import type { DocKind, SensitivityLevel } from '@/lib/schemas/documents';

export interface DocumentListItem {
  id: string;
  circleId: string;
  kind: DocKind;
  title: string;
  blobPathname: string;
  mimeType: string;
  sizeBytes: number;
  reportDate: string | null;
  sensitivity: SensitivityLevel;
  uploadedBy: string;
  uploaderName: string;
  createdAt: string;
  canView: boolean;
  grantCount: number;
}

/**
 * Lists documents for a circle, enforcing can_view_document SQL function.
 * If sensitivity is restricted and user cannot view, title is masked as 'Restricted document'.
 */
export async function listDocuments(
  ctx: CircleContext,
  options?: {
    kind?: DocKind | 'all';
    search?: string;
  },
): Promise<DocumentListItem[]> {
  return withUserTx(ctx.userId, async (tx) => {
    let baseSql = sql`
      SELECT
        d.id,
        d.circle_id,
        d.kind,
        CASE
          WHEN d.sensitivity = 'restricted' AND NOT can_view_document(d.id)
            THEN 'Restricted document'
          ELSE d.title
        END AS title,
        d.blob_pathname,
        d.mime_type,
        d.size_bytes,
        d.report_date::text AS report_date,
        d.sensitivity,
        d.uploaded_by,
        COALESCE(u.full_name, 'Family Member') AS uploader_name,
        d.created_at::text AS created_at,
        can_view_document(d.id) AS can_view,
        (SELECT COUNT(*)::int FROM restricted_document_grants rdg WHERE rdg.document_id = d.id) AS grant_count
      FROM documents d
      LEFT JOIN member_profiles u ON d.uploaded_by = u.id
      WHERE d.circle_id = ${ctx.circleId}
        AND d.deleted_at IS NULL
    `;

    if (options?.kind && options.kind !== 'all') {
      baseSql = sql`${baseSql} AND d.kind = ${options.kind}`;
    }

    if (options?.search && options.search.trim()) {
      const searchPattern = `%${options.search.trim()}%`;
      baseSql = sql`${baseSql} AND (d.title ILIKE ${searchPattern} OR d.kind::text ILIKE ${searchPattern})`;
    }

    baseSql = sql`${baseSql} ORDER BY d.report_date DESC NULLS LAST, d.created_at DESC`;

    const result = await tx.execute<{
      id: string;
      circle_id: string;
      kind: DocKind;
      title: string;
      blob_pathname: string;
      mime_type: string;
      size_bytes: number;
      report_date: string | null;
      sensitivity: SensitivityLevel;
      uploaded_by: string;
      uploader_name: string;
      created_at: string;
      can_view: boolean;
      grant_count: number;
    }>(baseSql);

    return result.rows.map((r) => ({
      id: r.id,
      circleId: r.circle_id,
      kind: r.kind,
      title: r.title,
      blobPathname: r.blob_pathname,
      mimeType: r.mime_type,
      sizeBytes: r.size_bytes,
      reportDate: r.report_date,
      sensitivity: r.sensitivity,
      uploadedBy: r.uploaded_by,
      uploaderName: r.uploader_name,
      createdAt: r.created_at,
      canView: r.can_view,
      grantCount: r.grant_count,
    }));
  });
}

/**
 * Uploads a document and bumps circle version.
 */
export async function uploadDocumentData(
  ctx: CircleContext,
  fileBuffer: Buffer,
  meta: UploadDocumentMeta,
) {
  const doc = await uploadDocBlob(ctx, fileBuffer, meta);
  await bumpCircleVersion(ctx.circleId);
  return doc;
}

/**
 * Retrieves a 60-second signed URL for a document.
 */
export async function getDocumentSignedUrl(
  ctx: CircleContext,
  documentId: string,
): Promise<SignedDocUrlResult> {
  return getDocUrlBlob(ctx, documentId);
}

/**
 * Soft deletes a document and bumps circle version.
 */
export async function deleteDocumentData(ctx: CircleContext, documentId: string): Promise<void> {
  await deleteDocBlob(ctx, documentId);
  await bumpCircleVersion(ctx.circleId);
}

/**
 * Grants access to a restricted document and bumps circle version.
 */
export async function grantDocumentAccessData(
  ctx: CircleContext,
  documentId: string,
  targetUserId: string,
): Promise<void> {
  await grantDocBlob(ctx, documentId, targetUserId);
  await bumpCircleVersion(ctx.circleId);
}

/**
 * Revokes access to a restricted document and bumps circle version.
 */
export async function revokeDocumentAccessData(
  ctx: CircleContext,
  documentId: string,
  targetUserId: string,
): Promise<void> {
  await revokeDocBlob(ctx, documentId, targetUserId);
  await bumpCircleVersion(ctx.circleId);
}

/**
 * Fetches access logs for a document.
 */
export async function getDocumentAccessLogsData(ctx: CircleContext, documentId: string) {
  return listLogsBlob(ctx.circleId, documentId, ctx.userId);
}

/**
 * Fetches granted members for a restricted document.
 */
export async function getDocumentGrantsData(documentId: string, userId: string) {
  return listGrantsBlob(documentId, userId);
}
