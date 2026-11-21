import 'server-only';
import { eq, and, sql } from 'drizzle-orm';
import { adminDb } from '@/db/admin';
import * as schema from '@/db/schema';
import {
  generateToken,
  hashToken,
  hashPassword,
  verifyPassword,
} from './crypto';
import {
  createSession,
  invalidateAllUserSessions,
} from './session';
import {
  signupLimiter,
  signinIpLimiter,
  signinEmailLimiter,
  resetLimiter,
} from '@/lib/utils/rate-limit';
import { sendEmail } from '@/lib/notifications/email';
import {
  verificationEmailHtml,
  resetPasswordEmailHtml,
  passwordChangedEmailHtml,
} from '@/lib/notifications/templates/auth-emails';
import type {
  SignupInput,
  SigninInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '@/lib/schemas/account';

const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$ZHVtbXlzYWx0MTIzNDU2Nw$4ZqjG5W+2i1N3e7zJ1kX7x4Vb+8wQ9a';

export async function signupUser(input: SignupInput, ip: string, userAgent?: string) {
  const limit = await signupLimiter.limit(ip);
  if (!limit.success) {
    throw new Error('Too many sign-up attempts. Please try again later.');
  }

  const email = input.email.toLowerCase().trim();

  const existing = await adminDb
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (existing.length > 0) {
    await sendEmail({
      to: email,
      subject: 'Sign-in attempt on Family Care Hub',
      html: `<p>Someone attempted to create an account with this email. If this was you, please sign in or reset your password.</p>`,
    });
    return { redirectTo: '/verify-email' };
  }

  const passwordHash = await hashPassword(input.password);

  const [newUser] = await adminDb
    .insert(schema.users)
    .values({
      email,
      fullName: input.fullName.trim(),
      passwordHash,
    })
    .returning();

  await createSession(newUser.id, { userAgent, ip });

  const rawVerifyToken = generateToken();
  const tokenHash = hashToken(rawVerifyToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await adminDb.insert(schema.authTokens).values({
    tokenHash,
    userId: newUser.id,
    purpose: 'verify_email',
    expiresAt,
  });

  const verifyUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/verify-email/${rawVerifyToken}`;
  await sendEmail({
    to: email,
    subject: 'Verify your Family Care Hub email',
    html: verificationEmailHtml(verifyUrl, newUser.fullName),
  });

  return { redirectTo: '/verify-email' };
}

export async function signinUser(input: SigninInput, ip: string, userAgent?: string) {
  const email = input.email.toLowerCase().trim();

  const ipLimit = await signinIpLimiter.limit(ip);
  if (!ipLimit.success) {
    throw new Error('Too many sign-in attempts. Please try again in 15 minutes.');
  }

  const emailLimit = await signinEmailLimiter.limit(email);
  if (!emailLimit.success) {
    throw new Error('Too many attempts for this account. Please try again in 15 minutes.');
  }

  const users = await adminDb
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (users.length === 0) {
    await verifyPassword(DUMMY_HASH, input.password);
    throw new Error('Email or password is incorrect');
  }

  const user = users[0];

  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    throw new Error('Too many attempts, try again in 15 minutes');
  }

  const isValid = await verifyPassword(user.passwordHash, input.password);

  if (!isValid) {
    const newFailures = user.failedLoginCount + 1;
    let lockedUntil: Date | null = null;
    if (newFailures >= 5) {
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }

    await adminDb
      .update(schema.users)
      .set({
        failedLoginCount: newFailures,
        lockedUntil,
      })
      .where(eq(schema.users.id, user.id));

    if (newFailures >= 5) {
      throw new Error('Too many attempts, try again in 15 minutes');
    }

    throw new Error('Email or password is incorrect');
  }

  await adminDb
    .update(schema.users)
    .set({
      failedLoginCount: 0,
      lockedUntil: null,
    })
    .where(eq(schema.users.id, user.id));

  if (user.totpEnabled) {
    return { redirectTo: `/login/2fa?uid=${user.id}` };
  }

  await createSession(user.id, { userAgent, ip });
  return { redirectTo: '/' };
}

export async function forgotPasswordUser(input: ForgotPasswordInput, ip: string) {
  await resetLimiter.limit(ip);
  const email = input.email.toLowerCase().trim();

  const users = await adminDb
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (users.length > 0) {
    const user = users[0];
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await adminDb.insert(schema.authTokens).values({
      tokenHash,
      userId: user.id,
      purpose: 'reset_password',
      expiresAt,
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password/${rawToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Reset your Family Care Hub password',
      html: resetPasswordEmailHtml(resetUrl, user.fullName),
    });
  }

  return { message: "If an account exists, we've sent a link to your email." };
}

export async function resetPasswordUser(input: ResetPasswordInput, ip: string, userAgent?: string) {
  const tokenHash = hashToken(input.token);

  const tokens = await adminDb
    .select()
    .from(schema.authTokens)
    .where(
      and(
        eq(schema.authTokens.tokenHash, tokenHash),
        eq(schema.authTokens.purpose, 'reset_password'),
        sql`used_at IS NULL`,
        sql`expires_at > now()`,
      ),
    )
    .limit(1);

  if (tokens.length === 0) {
    throw new Error('This password reset link is invalid or has expired.');
  }

  const tokenRecord = tokens[0];
  const newPasswordHash = await hashPassword(input.password);

  await adminDb
    .update(schema.users)
    .set({ passwordHash: newPasswordHash })
    .where(eq(schema.users.id, tokenRecord.userId));

  await adminDb
    .update(schema.authTokens)
    .set({ usedAt: new Date() })
    .where(eq(schema.authTokens.tokenHash, tokenHash));

  await invalidateAllUserSessions(tokenRecord.userId);
  await createSession(tokenRecord.userId, { userAgent, ip });

  const users = await adminDb
    .select({ email: schema.users.email, fullName: schema.users.fullName })
    .from(schema.users)
    .where(eq(schema.users.id, tokenRecord.userId))
    .limit(1);

  if (users.length > 0) {
    await sendEmail({
      to: users[0].email,
      subject: 'Your Family Care Hub password was changed',
      html: passwordChangedEmailHtml(users[0].fullName),
    });
  }

  return { redirectTo: '/' };
}

export async function verifyEmailTokenUser(token: string) {
  const tokenHash = hashToken(token);

  const tokens = await adminDb
    .select()
    .from(schema.authTokens)
    .where(
      and(
        eq(schema.authTokens.tokenHash, tokenHash),
        eq(schema.authTokens.purpose, 'verify_email'),
        sql`used_at IS NULL`,
        sql`expires_at > now()`,
      ),
    )
    .limit(1);

  if (tokens.length === 0) {
    return { ok: false, error: 'Verification link is invalid or has expired.' };
  }

  const tokenRecord = tokens[0];

  await adminDb
    .update(schema.users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(schema.users.id, tokenRecord.userId));

  await adminDb
    .update(schema.authTokens)
    .set({ usedAt: new Date() })
    .where(eq(schema.authTokens.tokenHash, tokenHash));

  return { ok: true };
}
