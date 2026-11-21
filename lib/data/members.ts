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

/**
 * Members of a circle with display names, for assignee pickers and task cards.
 * The caller's userId is needed so the query runs under their RLS context.
 */
export async function listCircleMembers(circleId: string, userId: string) {
  return withUserTx(userId, (tx) =>
    tx
      .select({
        userId: schema.circleMembers.userId,
        role: schema.circleMembers.role,
        fullName: schema.users.fullName,
        avatarUrl: schema.users.avatarUrl,
      })
      .from(schema.circleMembers)
      .innerJoin(schema.users, eq(schema.circleMembers.userId, schema.users.id))
      .where(eq(schema.circleMembers.circleId, circleId))
      .orderBy(schema.users.fullName),
  );
}

