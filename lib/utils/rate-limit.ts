import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

type LimiterResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

interface SimpleLimiter {
  limit(identifier: string): Promise<LimiterResult>;
}

const noopLimiter: SimpleLimiter = {
  async limit() {
    return {
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
    };
  },
};

function createLimiter(requests: number, window: `${number} s` | `${number} m` | `${number} h` | `${number} d`): SimpleLimiter {
  if (!redis) {
    return noopLimiter;
  }
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: false,
    prefix: 'ratelimit',
  });
}

// Limiters per requirements in Setup 1:
// signupLimiter, signinIpLimiter, signinEmailLimiter, resetLimiter, inviteLimiter, uploadLimiter, nudgeLimiter, pollLimiter
export const signupLimiter = createLimiter(5, '1 h');
export const signinIpLimiter = createLimiter(20, '15 m');
export const signinEmailLimiter = createLimiter(5, '15 m');
export const resetLimiter = createLimiter(3, '1 h');
export const inviteLimiter = createLimiter(10, '1 h');
export const uploadLimiter = createLimiter(30, '1 h');
export const nudgeLimiter = createLimiter(10, '1 h');
export const pollLimiter = createLimiter(120, '1 m');
