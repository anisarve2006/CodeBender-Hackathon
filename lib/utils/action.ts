import { z } from 'zod';
import type { ActionResult } from '@/lib/types/app';
import { requireUser, requireVerifiedUser, type AuthUser } from '@/lib/auth/session';

interface ActionOptions {
  auth?: 'none' | 'user' | 'verified';
}

export function createAction<TInput, TOutput>(
  schema: z.ZodType<TInput>,
  handler: (data: TInput, ctx: { user?: AuthUser }) => Promise<TOutput>,
  options: ActionOptions = { auth: 'user' },
) {
  return async (input: unknown): Promise<ActionResult<TOutput>> => {
    try {
      let user: AuthUser | undefined;

      if (options.auth === 'verified') {
        user = await requireVerifiedUser();
      } else if (options.auth === 'user') {
        user = await requireUser();
      }

      const parseResult = schema.safeParse(input);
      if (!parseResult.success) {
        const fieldErrors = parseResult.error.flatten().fieldErrors as Record<string, string[]>;
        return {
          ok: false,
          error: 'Validation failed. Please check the entered fields.',
          fieldErrors,
        };
      }

      const data = await handler(parseResult.data, { user });
      return { ok: true, data };
    } catch (err: unknown) {
      console.error('Server action error:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred. Please try again.';
      return {
        ok: false,
        error: message,
      };
    }
  };
}
