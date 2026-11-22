import { Receiver } from '@upstash/qstash';

const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY || '';
const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY || '';

let receiver: Receiver | null = null;
if (currentSigningKey && nextSigningKey) {
  receiver = new Receiver({
    currentSigningKey,
    nextSigningKey,
  });
}

/**
 * Verifies Upstash QStash request signatures using current and next keys.
 * Rejects requests without valid signatures.
 */
export async function verifyQStash(req: Request): Promise<boolean> {
  const signature = req.headers.get('upstash-signature');
  if (!signature) {
    return false;
  }

  // Allow bypass with explicit mock signature in testing / development when keys are not configured
  if (!receiver) {
    if (process.env.NODE_ENV !== 'production' && signature === 'mock-qstash-signature') {
      return true;
    }
    return false;
  }

  try {
    const body = await req.clone().text();
    const url = req.url;
    return await receiver.verify({
      signature,
      body,
      url,
    });
  } catch {
    return false;
  }
}
