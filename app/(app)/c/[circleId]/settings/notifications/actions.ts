'use server';

import { requireVerifiedUser } from '@/lib/auth/session';
import {
  updateUserNotificationPreferences,
  savePushSubscription,
  removePushSubscription,
  type NotificationPreferences,
} from '@/lib/jobs/user-prefs';
import type { ActionResult } from '@/lib/types/app';

export type { NotificationPreferences };

export async function updateNotificationPreferencesAction(
  prefs: NotificationPreferences,
): Promise<ActionResult<NotificationPreferences>> {
  try {
    const user = await requireVerifiedUser();
    await updateUserNotificationPreferences(user.id, prefs);
    return { ok: true, data: prefs };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update preferences';
    console.error('Failed to update notification preferences:', err);
    return { ok: false, error: message };
  }
}

export async function savePushSubscriptionAction(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<ActionResult<void>> {
  try {
    const user = await requireVerifiedUser();
    await savePushSubscription(user.id, subscription);
    return { ok: true, data: undefined };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save subscription';
    console.error('Failed to save push subscription:', err);
    return { ok: false, error: message };
  }
}

export async function removePushSubscriptionAction(
  endpoint: string,
): Promise<ActionResult<void>> {
  try {
    const user = await requireVerifiedUser();
    await removePushSubscription(user.id, endpoint);
    return { ok: true, data: undefined };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to remove subscription';
    console.error('Failed to remove push subscription:', err);
    return { ok: false, error: message };
  }
}
