import { withUserTx } from '@/db/client';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * lib/data/circles.ts
 * Owner: Member A
 */
export async function getUserFirstCircle(userId: string): Promise<string | null> {
  return withUserTx(userId, async (tx) => {
    const membership = await tx
      .select({ circleId: schema.circleMembers.circleId })
      .from(schema.circleMembers)
      .where(eq(schema.circleMembers.userId, userId))
      .limit(1);

    return membership[0]?.circleId || null;
  });
}
