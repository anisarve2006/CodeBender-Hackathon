import { setVapidDetails, sendNotification } from 'web-push';
import { serverEnv, clientEnv } from '@/lib/env';
import { adminDb } from '@/db/admin';
import { pushSubscriptions } from '@/db/schema/auth';
import { eq } from 'drizzle-orm';

if (clientEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY && serverEnv.VAPID_PRIVATE_KEY) {
  try {
    setVapidDetails(
      serverEnv.VAPID_SUBJECT,
      clientEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      serverEnv.VAPID_PRIVATE_KEY,
    );
  } catch (err) {
    console.warn('Failed to configure VAPID details for Web Push:', err);
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Sends a Web Push notification to all active devices registered to targetUserId.
 * Automatically prunes subscriptions that return 404/410.
 */
export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload,
): Promise<{ sent: number; failed: number }> {
  const subs = await adminDb
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (subs.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await sendNotification(pushSub, JSON.stringify(payload));
      sent++;
    } catch (err: unknown) {
      failed++;
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        // Expired or revoked subscription -> prune immediately from database
        try {
          await adminDb
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.endpoint, sub.endpoint));
        } catch (deleteErr) {
          console.error('Failed to prune expired push subscription:', deleteErr);
        }
      }
    }
  }

  return { sent, failed };
}
