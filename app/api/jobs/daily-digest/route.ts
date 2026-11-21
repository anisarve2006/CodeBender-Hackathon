import { NextResponse } from 'next/server';
import { verifyCronOrQStash } from '@/lib/jobs/auth';
import { runDailyDigestJob } from '@/lib/jobs/daily-digest';

export const dynamic = 'force-dynamic';

/**
 * Scheduled job: Evening 20:00 IST daily digest email dispatcher
 * Runs daily at 20:00 IST via Upstash QStash
 */
export async function POST(request: Request) {
  const isAuthorized = await verifyCronOrQStash(request);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runDailyDigestJob();
    return NextResponse.json({ ok: true, job: 'daily-digest', summary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Job failure';
    console.error('Error executing daily-digest job:', err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
