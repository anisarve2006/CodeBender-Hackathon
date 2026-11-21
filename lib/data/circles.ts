import 'server-only';
import { cookies } from 'next/headers';
import { eq, and, isNull } from 'drizzle-orm';
import { withUserTx } from '@/db/client';
import * as schema from '@/db/schema';
import type { CircleRole } from '@/lib/types/app';

/**
 * lib/data/circles.ts
 * Owner: Member A
 * Circle switcher query and last-used circle cookie helpers.
 */

export const LAST_CIRCLE_COOKIE = 'fch_last_circle';
const LAST_CIRCLE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CircleSummary = {
  id: string;
  name: string;
  role: CircleRole;
};

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

/** Every active circle the user belongs to, for the circle switcher. */
export async function listUserCircles(userId: string): Promise<CircleSummary[]> {
  return withUserTx(userId, async (tx) => {
    const rows = await tx
      .select({
        id: schema.careCircles.id,
        name: schema.careCircles.name,
        role: schema.circleMembers.role,
      })
      .from(schema.circleMembers)
      .innerJoin(schema.careCircles, eq(schema.circleMembers.circleId, schema.careCircles.id))
      .where(and(eq(schema.circleMembers.userId, userId), isNull(schema.careCircles.deletedAt)))
      .orderBy(schema.circleMembers.joinedAt);

    return rows;
  });
}

/** Call from a Server Action or Route Handler (cookies cannot be set during render). */
export async function setLastCircleCookie(circleId: string): Promise<void> {
  if (!UUID_RE.test(circleId)) return;
  const cookieStore = await cookies();
  cookieStore.set(LAST_CIRCLE_COOKIE, circleId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: LAST_CIRCLE_MAX_AGE_SECONDS,
  });
}

/** Reads the cookie value. The value is untrusted until membership is checked. */
export async function readLastCircleCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LAST_CIRCLE_COOKIE)?.value;
  return value && UUID_RE.test(value) ? value : null;
}

/**
 * Where to send a signed-in user: the last-used circle if they are still a
 * member, otherwise their first circle, otherwise null (go to onboarding).
 */
export async function resolveLandingCircleId(userId: string): Promise<string | null> {
  const lastUsed = await readLastCircleCookie();
  if (lastUsed) {
    const circles = await listUserCircles(userId);
    if (circles.some((circle) => circle.id === lastUsed)) {
      return lastUsed;
    }
  }
  return getUserFirstCircle(userId);
}
