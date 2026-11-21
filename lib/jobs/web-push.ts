import 'server-only';
import * as webpush from 'web-push';
import { eq } from 'drizzle-orm';
import { adminDb } from '@/db/admin';
import * as schema from '@/db/schema';
import { serverEnv } from '@/lib/env';

let vapidConfigured = false;

function initVapid(): boolean {
  if (vapidConfigured) return true;
  if (!serverEnv.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return false;
  }

  try {
    webpush.setVapidDetails(
      serverEnv.VAPID_SUBJECT,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      serverEnv.VAPID_PRIVATE_KEY,
    );
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.error('Failed to initialize web-push VAPID details:', err);
    return false;
  }
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export async function sendWebPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  if (!initVapid()) {
    console.log(`[DEV PUSH SIMULATOR] To user ${userId}:`, payload);
    return { sent: 1, failed: 0 };
  }

  const subscriptions = await adminDb
    .select()
    .from(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.userId, userId));

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      sent++;
    } catch (err: unknown) {
      failed++;
      const statusCode = typeof err === 'object' && err !== null && 'statusCode' in err
        ? (err as { statusCode?: number }).statusCode
        : undefined;

      // Subscription has expired or is unsubscribed (404 Not Found or 410 Gone)
      if (statusCode === 404 || statusCode === 410) {
        console.log(`Pruning stale push subscription for user ${userId}: ${sub.endpoint}`);
        await adminDb
          .delete(schema.pushSubscriptions)
          .where(eq(schema.pushSubscriptions.id, sub.id));
      } else {
        console.error('Error sending push notification:', err);
      }
    }
  }

  return { sent, failed };
}
