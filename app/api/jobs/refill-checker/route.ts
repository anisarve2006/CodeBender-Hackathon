import { NextResponse } from 'next/server';
import { verifyCronOrQStash } from '@/lib/jobs/auth';
import { runRefillCheckerJob } from '@/lib/jobs/refill-checker';

export const dynamic = 'force-dynamic';

/**
 * Scheduled job: Daily refill status calculation & task creation
 * Runs daily at 07:00 IST (01:30 UTC) via Upstash QStash
 */
export async function POST(request: Request) {
  const isAuthorized = await verifyCronOrQStash(request);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runRefillCheckerJob();
    return NextResponse.json({ ok: true, job: 'refill-checker', summary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Job failure';
    console.error('Error executing refill-checker job:', err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
