import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'node:crypto';
import { adminDb } from '@/db/admin';
import * as schema from '@/db/schema';
import { generateToken, hashToken } from './crypto';
import { redis } from '@/lib/utils/redis';

export const SESSION_COOKIE_NAME = '__Host-fch_session';
const SESSION_TTL_DAYS = 30;
const SESSION_EXTEND_THRESHOLD_DAYS = 15;

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  timezone: string;
  emailVerified: boolean;
};

export type ValidatedSession = {
  user: AuthUser;
  session: schema.Session;
};

export async function createSession(
  userId: string,
  meta?: { userAgent?: string; ip?: string },
): Promise<string> {
  const rawToken = generateToken();
  const sessionId = hashToken(rawToken);

  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const ipHash = meta?.ip
    ? crypto.createHash('sha256').update(meta.ip).digest('hex').substring(0, 16)
    : undefined;

  await adminDb.insert(schema.sessions).values({
    id: sessionId,
    userId,
    expiresAt,
    userAgent: meta?.userAgent,
    ipHash,
    lastSeenAt: new Date(),
  });

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });

  return rawToken;
}

export const validateSession = cache(async (): Promise<ValidatedSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const sessionId = hashToken(token);
  const cacheKey = `sess:${sessionId}`;

  // 1. Check Redis cache first (60s TTL)
  if (redis) {
    try {
      const cached = await redis.get<ValidatedSession>(cacheKey);
      if (cached && cached.session && cached.user) {
        return cached;
      }
    } catch {
      // Redis error: fall back to Postgres
    }
  }

  // 2. Fetch from Postgres
  const result = await adminDb
    .select({
      session: schema.sessions,
      user: schema.users,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(eq(schema.sessions.id, sessionId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const { session, user } = result[0];

  // 3. Reject expired sessions
  const now = new Date();
  if (new Date(session.expiresAt) <= now) {
    await invalidateSession(sessionId);
    return null;
  }

  // 4. Extend session if less than 15 days remain
  const remainingDays =
    (new Date(session.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (remainingDays < SESSION_EXTEND_THRESHOLD_DAYS) {
    const newExpiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
    await adminDb
      .update(schema.sessions)
      .set({ expiresAt: newExpiresAt, lastSeenAt: now })
      .where(eq(schema.sessions.id, sessionId));
    session.expiresAt = newExpiresAt;
  }

  const validated: ValidatedSession = {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      timezone: user.timezone,
      emailVerified: !!user.emailVerifiedAt,
    },
    session,
  };

  // Cache in Redis for 60s
  if (redis) {
    try {
      await redis.setex(cacheKey, 60, validated);
    } catch {
      // ignore Redis cache failure
    }
  }

  return validated;
});

export async function invalidateSession(sessionId: string): Promise<void> {
  await adminDb.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
  if (redis) {
    try {
      await redis.del(`sess:${sessionId}`);
    } catch {
      // ignore
    }
  }
}

export async function invalidateAllUserSessions(
  userId: string,
  exceptId?: string,
): Promise<void> {
  const query = exceptId
    ? and(eq(schema.sessions.userId, userId), sql`id != ${exceptId}`)
    : eq(schema.sessions.userId, userId);

  const userSessions = await adminDb
    .select({ id: schema.sessions.id })
    .from(schema.sessions)
    .where(query);

  await adminDb.delete(schema.sessions).where(query);

  if (redis && userSessions.length > 0) {
    const keys = userSessions.map((s) => `sess:${s.id}`);
    try {
      await redis.del(...keys);
    } catch {
      // ignore
    }
  }
}

export async function requireUser(): Promise<AuthUser> {
  const session = await validateSession();
  if (!session) {
    const reqHeaders = await headers();
    const pathname = reqHeaders.get('x-pathname') || '/';
    redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }
  return session.user;
}

export async function requireVerifiedUser(): Promise<AuthUser> {
  const user = await requireUser();
  if (!user.emailVerified) {
    redirect('/verify-email');
  }
  return user;
}
