import 'server-only';
import { z } from 'zod';

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_URL_OWNER: z.string().min(1, 'DATABASE_URL_OWNER is required'),
  DATABASE_URL_UNPOOLED: z.string().min(1, 'DATABASE_URL_UNPOOLED is required'),
  UPSTASH_REDIS_REST_URL: z.string().optional().default(''),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(''),
  QSTASH_TOKEN: z.string().optional().default(''),
  QSTASH_CURRENT_SIGNING_KEY: z.string().optional().default(''),
  QSTASH_NEXT_SIGNING_KEY: z.string().optional().default(''),
  BLOB_READ_WRITE_TOKEN: z.string().optional().default(''),
  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('Family Care Hub <onboarding@resend.dev>'),
  AUTH_ENCRYPTION_KEY: z.string().optional().default(''),
  VAPID_PRIVATE_KEY: z.string().optional().default(''),
  VAPID_SUBJECT: z.string().default('mailto:team@example.com'),
  ALLOW_SEED: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().default('http://localhost:3000'),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional().default(''),
  NEXT_PUBLIC_DEMO_MODE: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .default(false),
});

const isBuildOrTest =
  process.env.npm_lifecycle_event === 'build' ||
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.NODE_ENV === 'test' ||
  !!process.env.VITEST;

function parseServerEnv() {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    if (isBuildOrTest) {
      return serverSchema.parse({
        DATABASE_URL:
          process.env.DATABASE_URL ||
          'postgresql://app_user:mock@localhost:5432/family_care_hub',
        DATABASE_URL_OWNER:
          process.env.DATABASE_URL_OWNER ||
          'postgresql://owner:mock@localhost:5432/family_care_hub',
        DATABASE_URL_UNPOOLED:
          process.env.DATABASE_URL_UNPOOLED ||
          'postgresql://owner:mock@localhost:5432/family_care_hub',
        ...process.env,
      });
    }
    console.error('Invalid server environment variables:', result.error.format());
    throw new Error('Invalid server environment configuration');
  }
  return result.data;
}

function parseClientEnv() {
  const result = clientSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
  });
  if (!result.success) {
    console.error('Invalid client environment variables:', result.error.format());
    throw new Error('Invalid client environment configuration');
  }
  return result.data;
}

export const serverEnv = parseServerEnv();
export const clientEnv = parseClientEnv();
