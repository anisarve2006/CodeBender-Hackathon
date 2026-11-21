import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { requireCircleRole } from '@/lib/data/circle-context';
import { withUserTx } from '@/db/client';
import { sql } from 'drizzle-orm';
import { getDocumentSignedUrl } from '@/lib/data/documents';

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ documentId: string }> },
) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = await props.params;

    // Resolve document's circle
    const docRow = await withUserTx(user.id, async (tx) => {
      const res = await tx.execute<{ circle_id: string }>(sql`
        SELECT circle_id
        FROM documents
        WHERE id = ${documentId} AND deleted_at IS NULL
      `);
      return res.rows[0];
    });

    if (!docRow) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 },
      );
    }

    const ctx = await requireCircleRole(docRow.circle_id, [
      'owner',
      'coordinator',
      'caregiver',
      'viewer',
      'care_recipient',
    ]);

    const result = await getDocumentSignedUrl(ctx, documentId);

    return NextResponse.json(
      {
        url: result.url,
        expiresAt: result.expiresAt,
        title: result.title,
        mimeType: result.mimeType,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
        },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve document URL';
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
