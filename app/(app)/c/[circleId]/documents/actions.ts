'use server';

import { requireCircleRole } from '@/lib/data/circle-context';
import {
  deleteDocumentData,
  grantDocumentAccessData,
  revokeDocumentAccessData,
  getDocumentAccessLogsData,
  getDocumentGrantsData,
} from '@/lib/data/documents';
import {
  deleteDocumentSchema,
  grantDocumentAccessSchema,
  revokeDocumentAccessSchema,
} from '@/lib/schemas/documents';
import { withUserTx } from '@/db/client';
import { sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function deleteDocumentAction(input: unknown) {
  try {
    const parsed = deleteDocumentSchema.parse(input);
    const ctx = await requireCircleRole(parsed.circleId, ['owner', 'coordinator']);

    await deleteDocumentData(ctx, parsed.documentId);
    revalidatePath(`/c/${parsed.circleId}/documents`);
    revalidatePath(`/c/${parsed.circleId}/timeline`);

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete document';
    return { ok: false, error: message };
  }
}

export async function grantDocumentAccessAction(input: unknown) {
  try {
    const parsed = grantDocumentAccessSchema.parse(input);
    const ctx = await requireCircleRole(parsed.circleId, ['owner', 'coordinator']);

    await grantDocumentAccessData(ctx, parsed.documentId, parsed.targetUserId);
    revalidatePath(`/c/${parsed.circleId}/documents`);

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to grant access';
    return { ok: false, error: message };
  }
}

export async function revokeDocumentAccessAction(input: unknown) {
  try {
    const parsed = revokeDocumentAccessSchema.parse(input);
    const ctx = await requireCircleRole(parsed.circleId, ['owner', 'coordinator']);

    await revokeDocumentAccessData(ctx, parsed.documentId, parsed.targetUserId);
    revalidatePath(`/c/${parsed.circleId}/documents`);

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to revoke access';
    return { ok: false, error: message };
  }
}

export async function getDocumentAccessLogsAction(input: {
  circleId: string;
  documentId: string;
}) {
  try {
    const ctx = await requireCircleRole(input.circleId, ['owner', 'coordinator']);
    const logs = await getDocumentAccessLogsData(ctx, input.documentId);
    return { ok: true, data: logs };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load access logs';
    return { ok: false, error: message };
  }
}

export async function getDocumentGrantsAction(input: {
  circleId: string;
  documentId: string;
}) {
  try {
    const ctx = await requireCircleRole(input.circleId, ['owner', 'coordinator']);
    const grants = await getDocumentGrantsData(input.documentId, ctx.userId);
    return { ok: true, data: grants };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load document grants';
    return { ok: false, error: message };
  }
}

export async function getCircleMembersForGrantAction(input: { circleId: string }) {
  try {
    const ctx = await requireCircleRole(input.circleId, ['owner', 'coordinator']);
    const result = await withUserTx(ctx.userId, async (tx) => {
      const res = await tx.execute<{
        user_id: string;
        full_name: string;
        role: string;
      }>(sql`
        SELECT cm.user_id, COALESCE(u.full_name, 'Family Member') AS full_name, cm.role
        FROM circle_members cm
        JOIN member_profiles u ON cm.user_id = u.id
        WHERE cm.circle_id = ${input.circleId}
        ORDER BY u.full_name ASC
      `);
      return res.rows;
    });

    return {
      ok: true,
      data: result.map((r: { user_id: string; full_name: string; role: string }) => ({
        userId: r.user_id,
        fullName: r.full_name,
        role: r.role,
      })),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load circle members';
    return { ok: false, error: message };
  }
}
