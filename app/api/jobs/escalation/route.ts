import { NextResponse, type NextRequest } from 'next/server';
import { verifyQStash } from '@/lib/jobs/verify';
import { runTaskEscalation } from '@/lib/jobs/escalation';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Scheduled job route: Hourly task escalation for items overdue > 24 hours.
 * Requires valid Upstash QStash signature.
 */
export async function POST(request: NextRequest) {
  const verified = await verifyQStash(request);
  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized: Invalid QStash signature' }, { status: 401 });
  }

  try {
    const result = await runTaskEscalation();
    return NextResponse.json({ ok: true, job: 'escalation', result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Job failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
