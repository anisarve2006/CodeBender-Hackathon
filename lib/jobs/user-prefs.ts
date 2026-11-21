import 'server-only';
import { eq } from 'drizzle-orm';
import { adminDb } from '@/db/admin';
import * as schema from '@/db/schema';

export type NotificationPreferences = {
  email: boolean;
  push: boolean;
  digest: boolean;
  digestTime?: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
};

export async function getUserNotificationPreferences(
  userId: string,
): Promise<NotificationPreferences> {
  const userRow = await adminDb
    .select({
      notificationPrefs: schema.users.notificationPrefs,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  const prefs = userRow[0]?.notificationPrefs as Record<string, unknown> | null;

  return {
    email: typeof prefs?.email === 'boolean' ? prefs.email : true,
    push: typeof prefs?.push === 'boolean' ? prefs.push : false,
    digest: typeof prefs?.digest === 'boolean' ? prefs.digest : true,
    digestTime: typeof prefs?.digestTime === 'string' ? prefs.digestTime : '20:00',
    quietHoursStart: typeof prefs?.quietHoursStart === 'string' ? prefs.quietHoursStart : '22:00',
    quietHoursEnd: typeof prefs?.quietHoursEnd === 'string' ? prefs.quietHoursEnd : '07:00',
  };
}

export async function updateUserNotificationPreferences(
  userId: string,
  prefs: NotificationPreferences,
): Promise<void> {
  await adminDb
    .update(schema.users)
    .set({
      notificationPrefs: prefs,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));
}

export async function savePushSubscription(
  userId: string,
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  },
): Promise<void> {
  const existing = await adminDb
    .select()
    .from(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.endpoint, subscription.endpoint))
    .limit(1);

  if (existing.length === 0) {
    await adminDb.insert(schema.pushSubscriptions).values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });
  }

  const current = await getUserNotificationPreferences(userId);
  await updateUserNotificationPreferences(userId, {
    ...current,
    push: true,
  });
}

export async function removePushSubscription(
  userId: string,
  endpoint: string,
): Promise<void> {
  await adminDb
    .delete(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.endpoint, endpoint));

  const remaining = await adminDb
    .select()
    .from(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.userId, userId))
    .limit(1);

  if (remaining.length === 0) {
    const current = await getUserNotificationPreferences(userId);
    await updateUserNotificationPreferences(userId, {
      ...current,
      push: false,
    });
  }
}
