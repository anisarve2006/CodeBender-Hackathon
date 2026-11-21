'use server';

import { redirect } from 'next/navigation';
import { requireCircleRole } from '@/lib/data/circle-context';
import { deleteCirclePermanently } from '@/lib/jobs/circle-deletion';
import type { ActionResult } from '@/lib/types/app';

export async function deleteCircleAction(
  circleId: string,
  confirmedName: string,
): Promise<ActionResult<void>> {
  try {
    await requireCircleRole(circleId, ['owner']);
    await deleteCirclePermanently(circleId, confirmedName);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete circle.';
    console.error('Delete circle error:', err);
    return { ok: false, error: message };
  }

  redirect('/');
}
