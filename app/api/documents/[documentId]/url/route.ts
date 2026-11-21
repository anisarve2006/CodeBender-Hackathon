import { NextResponse, type NextRequest } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import {
  canViewDocument,
  getDocumentBlobRef,
  logDocumentAccess,
} from '@/lib/data/documents';
import { createSignedDocumentUrl, SIGNED_URL_TTL_SECONDS } from '@/lib/utils/blob';

/**
 * Signed Vercel Blob download URL dispenser (60s validity).
 * Owner: Member B
 *
 * Returns 401 without a session (validateSession, not requireUser, which redirects),
 * 403 when can_view_document() is false, otherwise logs the view and returns { url }.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params;

  if (!UUID_PATTERN.test(documentId)) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const session = await validateSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  if (!session.user.emailVerified) {
    return NextResponse.json({ error: 'Verify your email first.' }, { status: 403 });
  }

  const userId = session.user.id;

  const allowed = await canViewDocument(userId, documentId);
  if (!allowed) {
    return NextResponse.json({ error: 'You do not have access to this document.' }, { status: 403 });
  }

  const doc = await getDocumentBlobRef(userId, documentId);
  if (!doc) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const url = await createSignedDocumentUrl(doc.blobPathname);
  await logDocumentAccess(userId, documentId, doc.circleId);

  return NextResponse.json(
    { url, expiresInSeconds: SIGNED_URL_TTL_SECONDS },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
