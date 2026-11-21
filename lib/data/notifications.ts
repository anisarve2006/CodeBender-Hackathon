import { withUserTx } from '@/db/client';
import { sql } from 'drizzle-orm';

export interface UserNotificationPrefs {
  email: boolean;
  push: boolean;
  digest: boolean;
  quietHours?: {
    enabled: boolean;
    start: string; // e.g. "22:00"
    end: string;   // e.g. "07:00"
  };
}

/**
 * Fetches notification preferences for a user under withUserTx (RLS enforced).
 */
export async function getUserNotificationPrefs(userId: string): Promise<UserNotificationPrefs> {
  return withUserTx(userId, async (tx) => {
    const res = await tx.execute<{ notification_prefs: UserNotificationPrefs | null }>(sql`
      SELECT notification_prefs
      FROM users
      WHERE id = ${userId}
    `);

    const prefs = res.rows[0]?.notification_prefs;
    return {
      email: prefs?.email ?? true,
      push: prefs?.push ?? false,
      digest: prefs?.digest ?? true,
      quietHours: prefs?.quietHours ?? {
        enabled: false,
        start: '22:00',
        end: '07:00',
      },
    };
  });
}

/**
 * Updates notification preferences for the signed-in user under withUserTx (RLS enforced).
 */
export async function updateUserNotificationPrefs(
  userId: string,
  prefs: UserNotificationPrefs,
): Promise<void> {
  await withUserTx(userId, async (tx) => {
    await tx.execute(sql`
      UPDATE users
      SET notification_prefs = ${JSON.stringify(prefs)}::jsonb,
          updated_at = now()
      WHERE id = ${userId}
    `);
  });
}

/**
 * Stores a browser Web Push subscription for the signed-in user under withUserTx.
 */
export async function savePushSubscription(
  userId: string,
  sub: { endpoint: string; p256dh: string; auth: string },
): Promise<void> {
  await withUserTx(userId, async (tx) => {
    await tx.execute(sql`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES (${userId}, ${sub.endpoint}, ${sub.p256dh}, ${sub.auth})
      ON CONFLICT (endpoint)
      DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
    `);
  });
}

/**
 * Removes a browser Web Push subscription for the signed-in user under withUserTx.
 */
export async function deletePushSubscription(
  userId: string,
  endpoint: string,
): Promise<void> {
  await withUserTx(userId, async (tx) => {
    await tx.execute(sql`
      DELETE FROM push_subscriptions
      WHERE user_id = ${userId} AND endpoint = ${endpoint}
    `);
  });
}
