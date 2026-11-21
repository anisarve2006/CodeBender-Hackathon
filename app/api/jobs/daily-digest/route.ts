import { NextResponse } from 'next/server';

/**
 * Scheduled job: Evening 20:00 IST daily digest email dispatcher
 * Owner: Member B
 */
export async function POST() {
  return NextResponse.json({ ok: true, job: 'daily-digest stub' });
}
