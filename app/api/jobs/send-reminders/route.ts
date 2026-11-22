import { NextResponse, type NextRequest } from 'next/server';
import { verifyCronJob } from '@/lib/jobs/verify';
import { processPendingRemindersBatch } from '@/lib/jobs/send-reminders';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Scheduled job route: Dispatches pending reminders every 15 minutes.
 * Protected via CRON_SECRET authorization header.
 */
export async function POST(request: NextRequest) {
  const verified = await verifyCronJob(request);
  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized: Invalid cron authorization' }, { status: 401 });
  }

  try {
    const result = await processPendingRemindersBatch(500);
    return NextResponse.json({ ok: true, job: 'send-reminders', result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Job failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
