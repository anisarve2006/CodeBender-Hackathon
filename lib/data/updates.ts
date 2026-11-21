import 'server-only';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { withUserTx } from '@/db/client';
import * as schema from '@/db/schema';
import type { CircleContext } from '@/lib/types/app';
import type { UpdateMood } from '@/lib/schemas/updates';

/**
 * lib/data/updates.ts
 * Owner: Member A
 * Family update feed queries and the insert. Every query runs inside withUserTx
 * so Postgres RLS applies. Callers check roles, then bumpCircleVersion and revalidatePath.
 */

export const UPDATE_FEED_LIMIT = 20;

export type UpdateView = {
  id: string;
  body: string;
  /** Stored tag. New rows hold one of the four moods; older seed rows may hold free text. */
  moodTag: string | null;
  authorName: string | null;
  createdAt: Date;
};

/** Latest updates in the circle, newest first. */
export async function listUpdates(
  ctx: CircleContext,
  limit: number = UPDATE_FEED_LIMIT,
): Promise<UpdateView[]> {
  return withUserTx(ctx.userId, (tx) =>
    tx
      .select({
        id: schema.updates.id,
        body: schema.updates.body,
        moodTag: schema.updates.moodTag,
        authorName: schema.users.fullName,
        createdAt: schema.updates.createdAt,
      })
      .from(schema.updates)
      .leftJoin(schema.users, eq(schema.updates.authorId, schema.users.id))
      .where(and(eq(schema.updates.circleId, ctx.circleId), isNull(schema.updates.deletedAt)))
      .orderBy(desc(schema.updates.createdAt), desc(schema.updates.id))
      .limit(limit),
  );
}

export type NewUpdateInput = { body: string; mood: UpdateMood };

/** Inserts a family update authored by the caller. */
export async function createUpdate(ctx: CircleContext, input: NewUpdateInput): Promise<string> {
  return withUserTx(ctx.userId, async (tx) => {
    const [inserted] = await tx
      .insert(schema.updates)
      .values({
        circleId: ctx.circleId,
        authorId: ctx.userId,
        body: input.body,
        moodTag: input.mood,
      })
      .returning({ id: schema.updates.id });
    return inserted.id;
  });
}
