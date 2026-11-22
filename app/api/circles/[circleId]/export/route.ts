import { NextResponse, type NextRequest } from 'next/server';
import { requireCircleRole } from '@/lib/data/circle-context';
import { exportCircleDataZip } from '@/lib/data/export';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ circleId: string }> },
) {
  try {
    const { circleId } = await props.params;
    const ctx = await requireCircleRole(circleId, ['owner']);

    const { zipBuffer, circleName } = await exportCircleDataZip(ctx);
    const safeName = circleName.replace(/[^a-zA-Z0-9.-]/g, '_');

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="care-circle-${safeName}-export.zip"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
