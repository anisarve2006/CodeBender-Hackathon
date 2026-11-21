import { NextResponse } from 'next/server';
import { verifyCronOrQStash } from '@/lib/jobs/auth';
import { runSendRemindersJob } from '@/lib/jobs/send-reminders';

export const dynamic = 'force-dynamic';

/**
 * Scheduled job: Dispatch pending 15-minute reminders
 * Runs every 15 minutes via Upstash QStash
 */
export async function POST(request: Request) {
  const isAuthorized = await verifyCronOrQStash(request);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runSendRemindersJob();
    return NextResponse.json({ ok: true, job: 'send-reminders', summary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Job failure';
    console.error('Error executing send-reminders job:', err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
