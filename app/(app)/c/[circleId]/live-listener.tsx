'use client';

import { useLiveCircle } from '@/lib/live/use-live-circle';

export function LiveCircleListener({ circleId }: { circleId: string }) {
  useLiveCircle(circleId);
  return null;
}
