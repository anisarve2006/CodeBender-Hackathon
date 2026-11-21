'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

export function useLiveCircle(circleId: string, onChange?: (version: number) => void) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const lastVersionRef = useRef<number | null>(null);

  useEffect(() => {
    const checkVersion = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }

      try {
        const res = await fetch(`/api/circles/${circleId}/version`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const data = (await res.json()) as { v: number };
          if (lastVersionRef.current !== null && lastVersionRef.current !== data.v) {
            lastVersionRef.current = data.v;
            if (onChange) {
              onChange(data.v);
            } else {
              router.refresh();
              queryClient.invalidateQueries({ queryKey: [circleId] });
            }
          } else {
            lastVersionRef.current = data.v;
          }
        }
      } catch {
        // Ignore polling network glitches
      }
    };

    checkVersion();
    const timer = setInterval(checkVersion, 10000);

    const onFocus = () => {
      checkVersion();
    };

    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [circleId, onChange, router, queryClient]);
}
