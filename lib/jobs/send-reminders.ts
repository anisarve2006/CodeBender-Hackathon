import { adminDb } from '@/db/admin';
import { sql } from 'drizzle-orm';
import { sendEmail } from '@/lib/notifications/email';
import { sendPushNotification } from './push';
import { clientEnv } from '@/lib/env';

interface ReminderBatchRow extends Record<string, unknown> {
  id: string;
  circle_id: string;
  circle_name: string;
  target_user_id: string;
  user_email: string;
  user_name: string;
  user_timezone: string;
  notification_prefs: {
    email?: boolean;
    push?: boolean;
    digest?: boolean;
    quietHours?: { start: string; end: string };
  } | null;
  kind: string;
  channel: 'email' | 'push';
  entity_type: string;
  entity_id: string;
  remind_at: string;
  payload: Record<string, unknown> | null;
  attempt_count: number;
}

/**
 * Checks whether current time in user's timezone falls within their quiet hours.
 */
function isQuietHours(
  timezone: string,
  quietHours?: { start: string; end: string },
): boolean {
  if (!quietHours?.start || !quietHours?.end) return false;

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hour = parts.find((p) => p.type === 'hour')?.value || '00';
    const minute = parts.find((p) => p.type === 'minute')?.value || '00';
    const currentTimeStr = `${hour}:${minute}`;

    const { start, end } = quietHours;
    if (start < end) {
      return currentTimeStr >= start && currentTimeStr <= end;
    } else {
      // Over midnight (e.g. 22:00 to 07:00)
      return currentTimeStr >= start || currentTimeStr <= end;
    }
  } catch {
    return false;
  }
}

/**
 * Scheduled Job: Dispatches pending reminders with:
 * - Atomic FOR UPDATE SKIP LOCKED batch acquisition
 * - Strict quiet hours and notification preference respect
 * - Medical privacy guardrail: Zero medicine names or diagnoses in subjects/bodies
 * - Idempotent delivery (never double-sends even under concurrent executions)
 */
export async function processPendingRemindersBatch(limit = 500) {
  return adminDb.transaction(async (tx) => {
    // 1. Lock pending reminders atomically
    const batch = await tx.execute<ReminderBatchRow>(sql`
      SELECT
        r.id,
        r.circle_id,
        c.name AS circle_name,
        r.target_user_id,
        u.email AS user_email,
        u.full_name AS user_name,
        COALESCE(u.timezone, 'Asia/Kolkata') AS user_timezone,
        u.notification_prefs,
        r.kind,
        r.channel,
        r.entity_type,
        r.entity_id,
        r.remind_at::text,
        r.payload,
        r.attempt_count
      FROM reminders r
      JOIN users u ON r.target_user_id = u.id
      JOIN care_circles c ON r.circle_id = c.id
      WHERE r.sent_at IS NULL
        AND r.remind_at <= now()
        AND r.attempt_count < 5
      ORDER BY r.remind_at ASC
      LIMIT ${limit}
      FOR UPDATE OF r SKIP LOCKED
    `);

    const rows = batch.rows;
    let successCount = 0;
    let failedCount = 0;
    let quietHoursDeferred = 0;

    for (const item of rows) {
      const prefs = item.notification_prefs;

      // 2. Respect quiet hours
      if (prefs?.quietHours && isQuietHours(item.user_timezone, prefs.quietHours)) {
        // Defer remind_at by 30 minutes
        await tx.execute(sql`
          UPDATE reminders
          SET remind_at = now() + interval '30 minutes'
          WHERE id = ${item.id}
        `);
        quietHoursDeferred++;
        continue;
      }

      // 3. Respect user opt-out preferences
      if (item.channel === 'email' && prefs?.email === false) {
        await tx.execute(sql`UPDATE reminders SET sent_at = now() WHERE id = ${item.id}`);
        successCount++;
        continue;
      }

      if (item.channel === 'push' && prefs?.push === false) {
        await tx.execute(sql`UPDATE reminders SET sent_at = now() WHERE id = ${item.id}`);
        successCount++;
        continue;
      }

      // 4. Construct privacy-compliant notification message
      // Guardrail: Never include medicine names, diagnoses, or document titles
      const circleName = item.circle_name;
      let subject = `Care notification for ${circleName}`;
      let bodyText = `You have an update in your family care circle "${circleName}".`;
      let actionUrl = `${clientEnv.NEXT_PUBLIC_SITE_URL}/c/${item.circle_id}`;

      if (item.entity_type === 'appointment') {
        subject = `Doctor appointment reminder – ${circleName}`;
        bodyText = `A doctor appointment is scheduled in your family care circle "${circleName}". Please check the schedule for details.`;
        actionUrl = `${clientEnv.NEXT_PUBLIC_SITE_URL}/c/${item.circle_id}/appointments`;
      } else if (item.entity_type === 'refill') {
        subject = `Medication refill reminder – ${circleName}`;
        bodyText = `A prescription refill requires attention in your family care circle "${circleName}".`;
        actionUrl = `${clientEnv.NEXT_PUBLIC_SITE_URL}/c/${item.circle_id}/meds`;
      } else if (item.entity_type === 'task') {
        subject = `Care task reminder – ${circleName}`;
        bodyText = `You have a care task due in "${circleName}".`;
        actionUrl = `${clientEnv.NEXT_PUBLIC_SITE_URL}/c/${item.circle_id}/tasks`;
      }

      try {
        if (item.channel === 'email') {
          const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
              <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Family Care Hub Notification</h2>
              <p style="color: #334155; font-size: 15px; line-height: 1.5;">${bodyText}</p>
              <div style="margin: 24px 0;">
                <a href="${actionUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
                  Open Family Care Hub
                </a>
              </div>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                To change your email or push notification preferences, visit your
                <a href="${clientEnv.NEXT_PUBLIC_SITE_URL}/c/${item.circle_id}/settings/notifications" style="color: #2563eb;">Notification Settings</a>.
              </p>
            </div>
          `;

          await sendEmail({
            to: item.user_email,
            subject,
            html,
            text: bodyText,
          });
        } else if (item.channel === 'push') {
          await sendPushNotification(item.target_user_id, {
            title: subject,
            body: bodyText,
            url: actionUrl,
          });
        }

        // 5. Mark successfully dispatched
        await tx.execute(sql`
          UPDATE reminders
          SET sent_at = now()
          WHERE id = ${item.id}
        `);
        successCount++;
      } catch (sendErr: unknown) {
        failedCount++;
        const errMsg = sendErr instanceof Error ? sendErr.message : 'Unknown dispatch error';
        await tx.execute(sql`
          UPDATE reminders
          SET
            attempt_count = attempt_count + 1,
            last_error = ${errMsg}
          WHERE id = ${item.id}
        `);
      }
    }

    return {
      total: rows.length,
      successCount,
      failedCount,
      quietHoursDeferred,
    };
  });
}
