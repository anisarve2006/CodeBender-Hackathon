'use server';

import { requireCircleRole } from '@/lib/data/circle-context';
import { deleteCircleAndAllData } from '@/lib/data/export';

export async function deleteCircleAction(input: {
  circleId: string;
  confirmationName: string;
}) {
  try {
    const ctx = await requireCircleRole(input.circleId, ['owner']);
    await deleteCircleAndAllData(ctx, input.confirmationName);
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete care circle';
    return { ok: false, error: message };
  }
}
