import { NextResponse } from 'next/server';

/**
 * iCalendar ICS feed route
 * Owner: Member B
 */
export async function GET() {
  return NextResponse.json({ message: 'ICS calendar stub' });
}
