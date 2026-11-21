import 'server-only';
import { eq } from 'drizzle-orm';
import { adminDb } from '@/db/admin';
import * as schema from '@/db/schema';

/**
 * Permanently deletes a circle and purges its blob assets.
 * Only owner role can execute.
 */
export async function deleteCirclePermanently(
  circleId: string,
  confirmedName: string,
): Promise<void> {
  // 1. Verify circle name matches
  const circle = await adminDb
    .select()
    .from(schema.careCircles)
    .where(eq(schema.careCircles.id, circleId))
    .limit(1);

  if (circle.length === 0) {
    throw new Error('Circle not found');
  }

  if (circle[0].name.trim().toLowerCase() !== confirmedName.trim().toLowerCase()) {
    throw new Error('The entered circle name does not match.');
  }

  // 2. Fetch all document blob paths to delete from storage
  const docs = await adminDb
    .select({ blobPathname: schema.documents.blobPathname })
    .from(schema.documents)
    .where(eq(schema.documents.circleId, circleId));

  // Purge from Vercel Blob if tokens exist
  if (process.env.BLOB_READ_WRITE_TOKEN && docs.length > 0) {
    try {
      const { del } = await import('@vercel/blob');
      const urlsToDelete = docs.map((d) => d.blobPathname).filter(Boolean);
      if (urlsToDelete.length > 0) {
        await del(urlsToDelete);
      }
    } catch (err) {
      console.warn('Could not batch delete blobs during circle removal:', err);
    }
  }

  // 3. Delete care_circles row (cascades to all other tables)
  await adminDb.delete(schema.careCircles).where(eq(schema.careCircles.id, circleId));
}
