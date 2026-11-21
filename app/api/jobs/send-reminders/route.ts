import { NextResponse } from 'next/server';

/**
 * Scheduled job: Dispatch pending 15-minute reminders
 * Owner: Member B
 */
export async function POST() {
  return NextResponse.json({ ok: true, job: 'send-reminders stub' });
}
