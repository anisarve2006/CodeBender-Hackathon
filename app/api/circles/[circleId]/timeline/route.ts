import { NextResponse, type NextRequest } from 'next/server';
import { requireCircleRole } from '@/lib/data/circle-context';
import { getCircleTimelineFeed } from '@/lib/data/timeline';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ circleId: string }> },
) {
  try {
    const { circleId } = await props.params;
    const ctx = await requireCircleRole(circleId, [
      'owner',
      'coordinator',
      'caregiver',
      'viewer',
      'care_recipient',
    ]);

    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor');
    const kindsRaw = searchParams.get('kinds');
    const kinds = kindsRaw ? kindsRaw.split(',').filter(Boolean) : null;
    const limit = Math.min(Number(searchParams.get('limit') || 20), 50);

    const result = await getCircleTimelineFeed(ctx, {
      cursor,
      kinds,
      limit,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch timeline';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
