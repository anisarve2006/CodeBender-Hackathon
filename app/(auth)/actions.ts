'use server';

import { headers, cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  invalidateSession,
  validateSession,
  SESSION_COOKIE_NAME,
} from '@/lib/auth/session';
import {
  signupUser,
  signinUser,
  forgotPasswordUser,
  resetPasswordUser,
  verifyEmailTokenUser,
} from '@/lib/auth/user-auth';
import {
  signupSchema,
  signinSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/lib/schemas/account';
import { createAction } from '@/lib/utils/action';

export const signupAction = createAction(
  signupSchema,
  async (input) => {
    const reqHeaders = await headers();
    const ip = reqHeaders.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = reqHeaders.get('user-agent') || undefined;

    return signupUser(input, ip, userAgent);
  },
  { auth: 'none' },
);

export const signinAction = createAction(
  signinSchema,
  async (input) => {
    const reqHeaders = await headers();
    const ip = reqHeaders.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = reqHeaders.get('user-agent') || undefined;

    return signinUser(input, ip, userAgent);
  },
  { auth: 'none' },
);

export async function signoutAction(): Promise<void> {
  const session = await validateSession();
  if (session) {
    await invalidateSession(session.session.id);
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect('/login');
}

export const forgotPasswordAction = createAction(
  forgotPasswordSchema,
  async (input) => {
    const reqHeaders = await headers();
    const ip = reqHeaders.get('x-forwarded-for') || '127.0.0.1';
    return forgotPasswordUser(input, ip);
  },
  { auth: 'none' },
);

export const resetPasswordAction = createAction(
  resetPasswordSchema,
  async (input) => {
    const reqHeaders = await headers();
    const ip = reqHeaders.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = reqHeaders.get('user-agent') || undefined;
    return resetPasswordUser(input, ip, userAgent);
  },
  { auth: 'none' },
);

export async function verifyEmailTokenAction(token: string) {
  return verifyEmailTokenUser(token);
}
