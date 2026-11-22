import { NextResponse, type NextRequest } from 'next/server';
import { verifyCronJob } from '@/lib/jobs/verify';
import { sendDailyDigests } from '@/lib/jobs/daily-digest';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Scheduled job route: Daily evening care coordination digest (20:00 IST).
 * Protected via CRON_SECRET authorization header.
 */
export async function POST(request: NextRequest) {
  const verified = await verifyCronJob(request);
  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized: Invalid cron authorization' }, { status: 401 });
  }

  try {
    const result = await sendDailyDigests();
    return NextResponse.json({ ok: true, job: 'daily-digest', result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Job failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
