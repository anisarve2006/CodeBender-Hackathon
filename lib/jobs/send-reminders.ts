import 'server-only';
import { sql } from 'drizzle-orm';
import { adminDb } from '@/db/admin';
import { sendEmail } from '@/lib/notifications/email';
import { sendWebPushToUser } from './web-push';

export type ReminderDispatchResult = {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
};

/**
 * Format completely neutral, privacy-safe notifications.
 * Medical guardrail: NEVER include medicine names, diagnoses, or document titles.
 */
export function formatNeutralReminder(
  kind: string,
  circleName: string,
): { title: string; body: string; url: string } {
  switch (kind) {
    case 'appointment':
      return {
        title: 'Upcoming Appointment Reminder',
        body: `You have an upcoming doctor consultation scheduled in ${circleName}. Please log in to view clinic location and details.`,
        url: '/',
      };
    case 'refill':
      return {
        title: 'Care Refill Reminder',
        body: `A scheduled care refill requires attention in ${circleName}. Please log in to check supply counts and update status.`,
        url: '/',
      };
    case 'task_due':
      return {
        title: 'Care Task Reminder',
        body: `You have a care coordination task due in ${circleName}. Please check your task board.`,
        url: '/',
      };
    case 'nudge':
      return {
        title: 'Family Care Nudge',
        body: `A family member sent a reminder regarding care coordination in ${circleName}.`,
        url: '/',
      };
    case 'escalation':
      return {
        title: 'Overdue Care Item Escalation',
        body: `A care item in ${circleName} has been overdue for more than 24 hours. Please review.`,
        url: '/',
      };
    default:
      return {
        title: 'Care Notification',
        body: `You have a new care coordination update in ${circleName}.`,
        url: '/',
      };
  }
}

export async function runSendRemindersJob(): Promise<ReminderDispatchResult> {
  const result: ReminderDispatchResult = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  // Claim up to 500 due reminders with row lock
  const claimed = await adminDb.execute<{
    id: string;
    circle_id: string;
    target_user_id: string;
    kind: string;
    channel: string;
    entity_type: string;
    entity_id: string;
    attempt_count: number;
    email: string;
    full_name: string;
    notification_prefs: { email?: boolean; push?: boolean } | null;
    circle_name: string;
  }>(sql`
    SELECT
      r.id,
      r.circle_id,
      r.target_user_id,
      r.kind,
      r.channel,
      r.entity_type,
      r.entity_id,
      r.attempt_count,
      u.email,
      u.full_name,
      u.notification_prefs,
      c.name AS circle_name
    FROM reminders r
    JOIN users u ON r.target_user_id = u.id
    JOIN care_circles c ON r.circle_id = c.id
    WHERE r.sent_at IS NULL
      AND r.remind_at <= now()
      AND r.attempt_count < 5
    ORDER BY r.remind_at ASC
    LIMIT 500
    FOR UPDATE OF r SKIP LOCKED;
  `);

  const rows = claimed.rows;
  result.processed = rows.length;

  for (const reminder of rows) {
    const prefs = reminder.notification_prefs || { email: true, push: false };
    const neutral = formatNeutralReminder(reminder.kind, reminder.circle_name);

    let dispatchSuccess = false;
    let dispatchError: string | null = null;

    try {
      if (reminder.channel === 'email') {
        if (prefs.email === false) {
          // User explicitly disabled email
          result.skipped++;
          dispatchSuccess = true;
        } else {
          await sendEmail({
            to: reminder.email,
            subject: `${neutral.title} – Family Care Hub`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #0f172a; margin-bottom: 16px;">${neutral.title}</h2>
                <p style="font-size: 16px; color: #334155; line-height: 1.5;">${neutral.body}</p>
                <div style="margin: 28px 0;">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}"
                     style="background-color: #0284c7; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                    Open Family Care Hub
                  </a>
                </div>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="font-size: 12px; color: #64748b;">
                  Family Care Hub organises information only and does not provide medical advice. Always consult a doctor.<br />
                  To manage your notification preferences, log in to your circle settings.
                </p>
              </div>
            `,
            text: `${neutral.title}\n\n${neutral.body}\n\nOpen Family Care Hub: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}\n\nFamily Care Hub organises information only and does not provide medical advice.`,
          });
          dispatchSuccess = true;
          result.sent++;
        }
      } else if (reminder.channel === 'push') {
        if (prefs.push === false) {
          // User disabled push
          result.skipped++;
          dispatchSuccess = true;
        } else {
          const pushRes = await sendWebPushToUser(reminder.target_user_id, {
            title: neutral.title,
            body: neutral.body,
            url: neutral.url,
          });
          if (pushRes.sent > 0 || pushRes.failed === 0) {
            dispatchSuccess = true;
            result.sent++;
          } else {
            dispatchError = 'Push failed to reach active subscriptions';
            result.failed++;
          }
        }
      } else {
        // In-app or other channel
        dispatchSuccess = true;
        result.sent++;
      }
    } catch (err: unknown) {
      dispatchSuccess = false;
      dispatchError = err instanceof Error ? err.message : 'Unknown dispatch error';
      result.failed++;
    }

    // Update row state idempotently
    if (dispatchSuccess) {
      await adminDb.execute(sql`
        UPDATE reminders
        SET sent_at = now(),
            last_error = NULL
        WHERE id = ${reminder.id}::uuid;
      `);
    } else {
      const nextAttempt = (reminder.attempt_count || 0) + 1;
      await adminDb.execute(sql`
        UPDATE reminders
        SET attempt_count = ${nextAttempt},
            last_error = ${dispatchError}
        WHERE id = ${reminder.id}::uuid;
      `);
    }
  }

  return result;
}
