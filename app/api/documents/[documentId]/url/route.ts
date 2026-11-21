import { NextResponse } from 'next/server';

/**
 * Signed Vercel Blob download URL dispenser (60s validity)
 * Owner: Member B
 */
export async function GET() {
  return NextResponse.json({ message: 'Signed Blob URL dispenser stub' });
}
