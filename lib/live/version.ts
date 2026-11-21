import 'server-only';
import { redis } from '@/lib/utils/redis';

/**
 * Bumps the circle version counter in Redis.
 * MUST be called after every successful database mutation by both members.
 */
export async function bumpCircleVersion(circleId: string): Promise<number> {
  if (!redis) {
    return Date.now();
  }
  try {
    return await redis.incr(`cv:${circleId}`);
  } catch {
    return Date.now();
  }
}
