import { NextResponse } from 'next/server';
import { verifyCronOrQStash } from '@/lib/jobs/auth';
import { runEscalationJob } from '@/lib/jobs/escalation';

export const dynamic = 'force-dynamic';

/**
 * Scheduled job: Hourly overdue task escalation to circle coordinator
 * Runs hourly via Upstash QStash
 */
export async function POST(request: Request) {
  const isAuthorized = await verifyCronOrQStash(request);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runEscalationJob();
    return NextResponse.json({ ok: true, job: 'escalation', summary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Job failure';
    console.error('Error executing escalation job:', err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
