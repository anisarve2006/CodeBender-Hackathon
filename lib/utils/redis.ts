import { Redis } from '@upstash/redis';

let redisInstance: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redisInstance = Redis.fromEnv();
}

export const redis = redisInstance;
