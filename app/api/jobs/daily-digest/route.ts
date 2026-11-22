import { NextResponse, type NextRequest } from 'next/server';
import { verifyQStash } from '@/lib/jobs/verify';
import { sendDailyDigests } from '@/lib/jobs/daily-digest';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Scheduled job route: Daily evening care coordination digest (20:00 IST).
 * Requires valid Upstash QStash signature.
 */
export async function POST(request: NextRequest) {
  const verified = await verifyQStash(request);
  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized: Invalid QStash signature' }, { status: 401 });
  }

  try {
    const result = await sendDailyDigests();
    return NextResponse.json({ ok: true, job: 'daily-digest', result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Job failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
