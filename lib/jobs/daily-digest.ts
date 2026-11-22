import { adminDb } from '@/db/admin';
import { sql } from 'drizzle-orm';
import { sendEmail } from '@/lib/notifications/email';
import { clientEnv } from '@/lib/env';

interface DigestUserRow extends Record<string, unknown> {
  id: string;
  email: string;
  full_name: string;
  timezone: string;
}

interface CircleSummaryRow extends Record<string, unknown> {
  circle_id: string;
  circle_name: string;
  pending_tasks: number;
  overdue_tasks: number;
  refills_needing_attention: number;
  upcoming_appointments: number;
}

/**
 * Scheduled Job: Daily Evening Digest (20:00 IST)
 * - Sends one consolidated email per opted-in family member
 * - Summarizes pending/overdue task counts across all their circles
 * - Medical guardrail: Zero medicine names, diagnoses, or clinical details
 */
export async function sendDailyDigests() {
  // 1. Fetch opted-in users with verified email
  const usersRes = await adminDb.execute<DigestUserRow>(sql`
    SELECT
      u.id,
      u.email,
      u.full_name,
      COALESCE(u.timezone, 'Asia/Kolkata') AS timezone
    FROM users u
    WHERE (u.notification_prefs->>'digest' IS NULL OR u.notification_prefs->>'digest' = 'true')
      AND (u.notification_prefs->>'email' IS NULL OR u.notification_prefs->>'email' = 'true')
      AND u.email_verified_at IS NOT NULL
  `);

  let digestsSent = 0;

  for (const user of usersRes.rows) {
    // 2. Fetch summary counts per circle for this user
    const summariesRes = await adminDb.execute<CircleSummaryRow>(sql`
      SELECT
        c.id AS circle_id,
        c.name AS circle_name,
        COUNT(DISTINCT CASE WHEN t.status IN ('todo', 'in_progress') AND (t.due_at IS NULL OR t.due_at >= now()) AND t.assigned_to = ${user.id} THEN t.id END)::int AS pending_tasks,
        COUNT(DISTINCT CASE WHEN t.status IN ('todo', 'in_progress') AND t.due_at < now() AND t.assigned_to = ${user.id} THEN t.id END)::int AS overdue_tasks,
        COUNT(DISTINCT CASE WHEN r.status IN ('due_soon', 'overdue') THEN r.id END)::int AS refills_needing_attention,
        COUNT(DISTINCT CASE WHEN a.starts_at >= now() AND a.starts_at <= (now() + interval '48 hours') AND a.status = 'scheduled' THEN a.id END)::int AS upcoming_appointments
      FROM circle_members cm
      JOIN care_circles c ON cm.circle_id = c.id
      LEFT JOIN tasks t ON t.circle_id = c.id AND t.deleted_at IS NULL
      LEFT JOIN refills r ON r.circle_id = c.id
      LEFT JOIN appointments a ON a.circle_id = c.id AND a.deleted_at IS NULL
      WHERE cm.user_id = ${user.id}
      GROUP BY c.id, c.name
    `);

    const activeCircles = summariesRes.rows.filter(
      (s) =>
        s.pending_tasks > 0 ||
        s.overdue_tasks > 0 ||
        s.refills_needing_attention > 0 ||
        s.upcoming_appointments > 0,
    );

    // If no action items in any circle, skip email
    if (activeCircles.length === 0) continue;

    // 3. Render accessible, medical-free HTML digest
    const circleCardsHtml = activeCircles
      .map(
        (c) => `
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; background: #f8fafc;">
          <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px;">${c.circle_name}</h3>
          <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.6;">
            ${c.overdue_tasks > 0 ? `<li style="color: #b91c1c; font-weight: 600;">${c.overdue_tasks} overdue task${c.overdue_tasks > 1 ? 's' : ''}</li>` : ''}
            ${c.pending_tasks > 0 ? `<li>${c.pending_tasks} pending task${c.pending_tasks > 1 ? 's' : ''} assigned to you</li>` : ''}
            ${c.upcoming_appointments > 0 ? `<li>${c.upcoming_appointments} scheduled appointment${c.upcoming_appointments > 1 ? 's' : ''} in the next 48 hours</li>` : ''}
            ${c.refills_needing_attention > 0 ? `<li>${c.refills_needing_attention} prescription refill${c.refills_needing_attention > 1 ? 's' : ''} requiring review</li>` : ''}
          </ul>
          <div style="margin-top: 12px;">
            <a href="${clientEnv.NEXT_PUBLIC_SITE_URL}/c/${c.circle_id}" style="color: #2563eb; font-size: 13px; font-weight: 600; text-decoration: none;">
              Open ${c.circle_name} Status Board &rarr;
            </a>
          </div>
        </div>
      `,
      )
      .join('');

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Kinly Evening Digest</h2>
        <p style="color: #475569; font-size: 14px;">Hello ${user.full_name}, here is your daily summary of active care coordination items across your family circles:</p>
        
        <div style="margin: 20px 0;">
          ${circleCardsHtml}
        </div>

        <div style="margin: 24px 0; text-align: center;">
          <a href="${clientEnv.NEXT_PUBLIC_SITE_URL}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
            Sign in to Kinly
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #64748b; font-size: 12px; margin: 0;">
          To turn off this daily summary, manage your preferences in
          <a href="${clientEnv.NEXT_PUBLIC_SITE_URL}/account" style="color: #2563eb;">Notification Settings</a>.
        </p>
      </div>
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Your Daily Kinly Digest',
        html: emailHtml,
        text: `You have active items in ${activeCircles.length} care circle(s). Sign in to view details: ${clientEnv.NEXT_PUBLIC_SITE_URL}`,
      });
      digestsSent++;
    } catch (err) {
      console.error(`Failed to send digest to ${user.email}:`, err);
    }
  }

  return { digestsSent };
}
