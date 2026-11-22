import 'server-only';
import { serverEnv } from '@/lib/env';

/**
 * Verifies cron / scheduled background job authorization.
 * Supports:
 * - Authorization: Bearer <CRON_SECRET>
 * - x-cron-secret: <CRON_SECRET>
 * - Legacy header fallback for tests: upstash-signature: mock-qstash-signature
 */
export async function verifyCronJob(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('authorization');
  const cronSecretHeader = req.headers.get('x-cron-secret');
  const legacySignature = req.headers.get('upstash-signature');

  const configuredSecret = serverEnv.CRON_SECRET;

  // 1. If CRON_SECRET is configured, check Bearer token or custom header
  if (configuredSecret) {
    if (authHeader && authHeader === `Bearer ${configuredSecret}`) {
      return true;
    }
    if (cronSecretHeader && cronSecretHeader === configuredSecret) {
      return true;
    }
    return false;
  }

  // 2. In non-production testing / dev environment:
  if (process.env.NODE_ENV !== 'production' || !!process.env.VITEST) {
    if (
      authHeader === 'Bearer mock-cron-secret' ||
      cronSecretHeader === 'mock-cron-secret' ||
      legacySignature === 'mock-qstash-signature'
    ) {
      return true;
    }
    // Reject unsigned/unauthorized requests
    return false;
  }

  return false;
}

/**
 * Backward compatibility alias for existing route handlers.
 */
export const verifyQStash = verifyCronJob;
