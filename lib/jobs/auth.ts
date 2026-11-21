import 'server-only';
import { Receiver } from '@upstash/qstash';
import { serverEnv } from '@/lib/env';

export async function verifyCronOrQStash(request: Request): Promise<boolean> {
  const currentKey = serverEnv.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey = serverEnv.QSTASH_NEXT_SIGNING_KEY;
  const signature = request.headers.get('upstash-signature');

  // 1. If QStash signature is present and keys are configured, verify it
  if (signature && currentKey) {
    try {
      const receiver = new Receiver({
        currentSigningKey: currentKey,
        nextSigningKey: nextKey || currentKey,
      });
      const body = await request.clone().text();
      const isValid = await receiver.verify({
        signature,
        body,
      });
      if (isValid) return true;
    } catch (err) {
      console.warn('QStash signature verification failed:', err);
    }
  }

  // 2. Check Bearer token against QSTASH_TOKEN or CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (serverEnv.QSTASH_TOKEN && token === serverEnv.QSTASH_TOKEN) {
      return true;
    }
    if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) {
      return true;
    }
  }

  // 3. Fallback for test / dev environment
  if (process.env.NODE_ENV !== 'production' || !currentKey) {
    return true;
  }

  return false;
}
