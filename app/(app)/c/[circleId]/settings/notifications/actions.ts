'use server';

import { requireUser } from '@/lib/auth/session';
import {
  updateUserNotificationPrefs,
  savePushSubscription,
  deletePushSubscription,
  type UserNotificationPrefs,
} from '@/lib/data/notifications';
import { revalidatePath } from 'next/cache';

export async function updateNotificationPrefsAction(
  circleId: string,
  prefs: UserNotificationPrefs,
) {
  try {
    const user = await requireUser();
    await updateUserNotificationPrefs(user.id, prefs);
    revalidatePath(`/c/${circleId}/settings/notifications`);
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update preferences';
    return { ok: false, error: message };
  }
}

export async function savePushSubscriptionAction(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  try {
    const user = await requireUser();
    await savePushSubscription(user.id, sub);
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save subscription';
    return { ok: false, error: message };
  }
}

export async function deletePushSubscriptionAction(endpoint: string) {
  try {
    const user = await requireUser();
    await deletePushSubscription(user.id, endpoint);
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete subscription';
    return { ok: false, error: message };
  }
}
