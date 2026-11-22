import { withUserTx } from '@/db/client';
import * as schema from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import type { CircleContext } from '@/lib/types/app';
import type { AssignableRole } from '@/lib/schemas/members';
import { memberErrorMessage } from '@/lib/data/member-errors';

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

export type MemberRosterRow = {
  userId: string;
  role: CircleContext['role'];
  relationship: string | null;
  city: string | null;
  joinedAt: Date;
  fullName: string;
  avatarUrl: string | null;
};

/** Full member cards for the Family page and the Settings member table. */
export async function listMemberRoster(circleId: string, userId: string): Promise<MemberRosterRow[]> {
  return withUserTx(userId, (tx) =>
    tx
      .select({
        userId: schema.circleMembers.userId,
        role: schema.circleMembers.role,
        relationship: schema.circleMembers.relationship,
        city: schema.circleMembers.city,
        joinedAt: schema.circleMembers.joinedAt,
        fullName: schema.users.fullName,
        avatarUrl: schema.users.avatarUrl,
      })
      .from(schema.circleMembers)
      .innerJoin(schema.users, eq(schema.circleMembers.userId, schema.users.id))
      .where(eq(schema.circleMembers.circleId, circleId))
      .orderBy(schema.users.fullName),
  );
}

/**
 * Sets a member's role. The database trigger (check_last_owner) rejects demoting
 * the last owner; its raw text is mapped to a plain message here.
 */
export async function changeMemberRole(
  ctx: CircleContext,
  targetUserId: string,
  role: AssignableRole,
): Promise<void> {
  let updated: { userId: string }[];
  try {
    updated = await withUserTx(ctx.userId, (tx) =>
      tx
        .update(schema.circleMembers)
        .set({ role })
        .where(
          and(
            eq(schema.circleMembers.circleId, ctx.circleId),
            eq(schema.circleMembers.userId, targetUserId),
          ),
        )
        .returning({ userId: schema.circleMembers.userId }),
    );
  } catch (err) {
    console.error('Change member role failed:', err);
    throw new Error(memberErrorMessage(err));
  }
  if (updated.length === 0) {
    throw new Error('That person is not a member of this circle.');
  }
}

/**
 * Removes a member from the circle. The last-owner trigger applies here too, and
 * its raw text is mapped to a plain message.
 */
export async function removeMember(ctx: CircleContext, targetUserId: string): Promise<void> {
  let removed: { userId: string }[];
  try {
    removed = await withUserTx(ctx.userId, (tx) =>
      tx
        .delete(schema.circleMembers)
        .where(
          and(
            eq(schema.circleMembers.circleId, ctx.circleId),
            eq(schema.circleMembers.userId, targetUserId),
          ),
        )
        .returning({ userId: schema.circleMembers.userId }),
    );
  } catch (err) {
    console.error('Remove member failed:', err);
    throw new Error(memberErrorMessage(err));
  }
  if (removed.length === 0) {
    throw new Error('That person is not a member of this circle.');
  }
}
