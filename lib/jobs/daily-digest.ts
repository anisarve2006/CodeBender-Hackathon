import 'server-only';
import { sql } from 'drizzle-orm';
import { adminDb } from '@/db/admin';
import { sendEmail } from '@/lib/notifications/email';

export type DailyDigestResult = {
  usersEvaluated: number;
  emailsSent: number;
  skipped: number;
};

export async function runDailyDigestJob(): Promise<DailyDigestResult> {
  const result: DailyDigestResult = {
    usersEvaluated: 0,
    emailsSent: 0,
    skipped: 0,
  };

  // 1. Fetch users with active circle memberships
  const usersWithItems = await adminDb.execute<{
    user_id: string;
    email: string;
    full_name: string;
    notification_prefs: { email?: boolean; digest?: boolean } | null;
    overdue_task_count: number;
    due_tomorrow_task_count: number;
    upcoming_appointment_count: number;
  }>(sql`
    SELECT
      u.id AS user_id,
      u.email,
      u.full_name,
      u.notification_prefs,
      COUNT(DISTINCT CASE WHEN t.due_at < now() AND t.status IN ('todo', 'in_progress') THEN t.id END)::int AS overdue_task_count,
      COUNT(DISTINCT CASE WHEN t.due_at >= now() AND t.due_at <= (now() + interval '24 hours') AND t.status IN ('todo', 'in_progress') THEN t.id END)::int AS due_tomorrow_task_count,
      COUNT(DISTINCT CASE WHEN a.starts_at >= now() AND a.starts_at <= (now() + interval '36 hours') AND a.status = 'scheduled' THEN a.id END)::int AS upcoming_appointment_count
    FROM users u
    JOIN circle_members cm ON u.id = cm.user_id
    LEFT JOIN tasks t ON t.assigned_to = u.id AND t.circle_id = cm.circle_id AND t.deleted_at IS NULL
    LEFT JOIN appointments a ON a.circle_id = cm.circle_id AND a.deleted_at IS NULL
    GROUP BY u.id, u.email, u.full_name, u.notification_prefs;
  `);

  const users = usersWithItems.rows;
  result.usersEvaluated = users.length;

  for (const user of users) {
    const prefs = user.notification_prefs || { email: true, digest: true };

    // Respect preferences: if email or digest is explicitly disabled, skip
    if (prefs.email === false || prefs.digest === false) {
      result.skipped++;
      continue;
    }

    const totalActionItems =
      user.overdue_task_count + user.due_tomorrow_task_count + user.upcoming_appointment_count;

    // If there is nothing pending or overdue, we can omit sending spam
    if (totalActionItems === 0) {
      result.skipped++;
      continue;
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Strictly privacy-safe summary: NO diagnoses, NO medicine names, NO document titles
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">Daily Care Digest</h2>
        <p style="color: #475569; font-size: 14px; margin-top: 0;">Good evening, ${user.full_name}. Here is your care summary for tomorrow.</p>

        <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <ul style="list-style: none; padding: 0; margin: 0; font-size: 15px; color: #334155;">
            <li style="padding: 8px 0; border-bottom: 1px solid #edf2f7;">
              <strong>Overdue items:</strong>
              <span style="color: ${user.overdue_task_count > 0 ? '#dc2626' : '#16a34a'}; font-weight: bold; margin-left: 6px;">
                ${user.overdue_task_count}
              </span>
            </li>
            <li style="padding: 8px 0; border-bottom: 1px solid #edf2f7;">
              <strong>Tasks due tomorrow:</strong>
              <span style="font-weight: bold; margin-left: 6px;">
                ${user.due_tomorrow_task_count}
              </span>
            </li>
            <li style="padding: 8px 0;">
              <strong>Upcoming appointments:</strong>
              <span style="font-weight: bold; margin-left: 6px;">
                ${user.upcoming_appointment_count}
              </span>
            </li>
          </ul>
        </div>

        <div style="margin: 24px 0;">
          <a href="${siteUrl}"
             style="background-color: #0284c7; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
            Open Family Care Hub
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #64748b;">
          Family Care Hub organises information only and does not provide medical advice. Always consult a doctor.<br />
          You can toggle daily digest emails in your circle notification settings.
        </p>
      </div>
    `;

    const textBody = `Daily Care Digest for ${user.full_name}\n\n` +
      `Overdue items: ${user.overdue_task_count}\n` +
      `Tasks due tomorrow: ${user.due_tomorrow_task_count}\n` +
      `Upcoming appointments: ${user.upcoming_appointment_count}\n\n` +
      `Open Family Care Hub: ${siteUrl}\n\n` +
      `Family Care Hub organises information only and does not provide medical advice.`;

    try {
      await sendEmail({
        to: user.email,
        subject: `Your Daily Care Summary (${totalActionItems} item${totalActionItems === 1 ? '' : 's'}) – Family Care Hub`,
        html: htmlBody,
        text: textBody,
      });
      result.emailsSent++;
    } catch (err) {
      console.error(`Failed to send daily digest to ${user.email}:`, err);
    }
  }

  return result;
}
