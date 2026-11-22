import { NextResponse, type NextRequest } from 'next/server';
import { verifyQStash } from '@/lib/jobs/verify';
import { processPendingRemindersBatch } from '@/lib/jobs/send-reminders';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Scheduled job route: Dispatches pending reminders every 15 minutes.
 * Requires valid Upstash QStash signature.
 */
export async function POST(request: NextRequest) {
  const verified = await verifyQStash(request);
  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized: Invalid QStash signature' }, { status: 401 });
  }

  try {
    const result = await processPendingRemindersBatch(500);
    return NextResponse.json({ ok: true, job: 'send-reminders', result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Job failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
