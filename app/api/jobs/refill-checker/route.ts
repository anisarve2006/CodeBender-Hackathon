import { NextResponse, type NextRequest } from 'next/server';
import { verifyCronJob } from '@/lib/jobs/verify';
import { runRefillChecker } from '@/lib/jobs/refill-checker';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Scheduled job route: Daily refill status evaluation & task creation (07:00 IST).
 * Protected via CRON_SECRET authorization header.
 */
export async function POST(request: NextRequest) {
  const verified = await verifyCronJob(request);
  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized: Invalid cron authorization' }, { status: 401 });
  }

  try {
    const result = await runRefillChecker();
    return NextResponse.json({ ok: true, job: 'refill-checker', result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Job failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
