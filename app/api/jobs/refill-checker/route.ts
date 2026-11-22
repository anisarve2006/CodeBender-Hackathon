import { NextResponse, type NextRequest } from 'next/server';
import { verifyQStash } from '@/lib/jobs/verify';
import { runRefillChecker } from '@/lib/jobs/refill-checker';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Scheduled job route: Daily refill status evaluation & task creation (07:00 IST).
 * Requires valid Upstash QStash signature.
 */
export async function POST(request: NextRequest) {
  const verified = await verifyQStash(request);
  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized: Invalid QStash signature' }, { status: 401 });
  }

  try {
    const result = await runRefillChecker();
    return NextResponse.json({ ok: true, job: 'refill-checker', result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Job failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
