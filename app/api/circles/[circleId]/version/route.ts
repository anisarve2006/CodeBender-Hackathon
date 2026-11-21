import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { pollLimiter } from '@/lib/utils/rate-limit';
import { redis } from '@/lib/utils/redis';
import { isCircleMemberUser } from '@/lib/data/members';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ circleId: string }> },
) {
  const { circleId } = await params;
  const ip = req.headers.get('x-forwarded-for') || 'local';

  const limitRes = await pollLimiter.limit(ip);
  if (!limitRes.success) {
    return NextResponse.json({ error: 'Too many poll requests' }, { status: 429 });
  }

  const session = await validateSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const memberCacheKey = `mem:${circleId}:${session.user.id}`;
  let isMember = false;

  if (redis) {
    const cached = await redis.get<boolean>(memberCacheKey);
    if (cached !== null) {
      isMember = cached;
    }
  }

  if (!isMember) {
    isMember = await isCircleMemberUser(circleId, session.user.id);
    if (redis) {
      await redis.setex(memberCacheKey, 60, isMember);
    }
  }

  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let version = 1;
  if (redis) {
    const v = await redis.get<number>(`cv:${circleId}`);
    if (v !== null) {
      version = v;
    }
  }

  return NextResponse.json(
    { v: version },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
