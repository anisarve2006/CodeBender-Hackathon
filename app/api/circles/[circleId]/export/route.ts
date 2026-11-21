import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { requireCircleRole } from '@/lib/data/circle-context';
import { getCircleExportData } from '@/lib/data/export';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ circleId: string }> },
) {
  try {
    const { circleId } = await params;
    const user = await requireUser();
    const ctx = await requireCircleRole(circleId, ['owner']);

    const exportData = await getCircleExportData(circleId, user.id);

    const safeCircleName = ctx.circleName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = `${safeCircleName}-care-records-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized or failed to export circle records';
    console.error('Export error:', err);
    return NextResponse.json(
      { error: message },
      { status: 403 },
    );
  }
}
