import { withUserTx } from '@/db/client';
import * as schema from '@/db/schema';
import { and, eq } from 'drizzle-orm';

/**
 * lib/data/members.ts
 * Owner: Member A
 */
export async function isCircleMemberUser(circleId: string, userId: string): Promise<boolean> {
  return withUserTx(userId, async (tx) => {
    const mem = await tx
      .select({ circleId: schema.circleMembers.circleId })
      .from(schema.circleMembers)
      .where(
        and(
          eq(schema.circleMembers.circleId, circleId),
          eq(schema.circleMembers.userId, userId),
        ),
      )
      .limit(1);

    return mem.length > 0;
  });
}
