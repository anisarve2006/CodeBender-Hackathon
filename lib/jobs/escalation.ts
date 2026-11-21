import { adminDb } from '@/db/admin';
import { sql } from 'drizzle-orm';
import { bumpCircleVersion } from '@/lib/live/version';

interface OverdueTaskRow extends Record<string, unknown> {
  task_id: string;
  circle_id: string;
  title: string;
  coordinator_id: string | null;
}

/**
 * Scheduled Job: Hourly Task Escalation
 * - Scans for tasks overdue by more than 24 hours
 * - Idempotently enqueues an escalation reminder to the circle coordinator (or owner)
 * - Ensures exactly once notification per task escalation window
 */
export async function runTaskEscalation() {
  const overdueTasks = await adminDb.execute<OverdueTaskRow>(sql`
    SELECT
      t.id AS task_id,
      t.circle_id,
      t.title,
      COALESCE(
        (SELECT cm.user_id FROM circle_members cm WHERE cm.circle_id = t.circle_id AND cm.role = 'coordinator' LIMIT 1),
        (SELECT cm.user_id FROM circle_members cm WHERE cm.circle_id = t.circle_id AND cm.role = 'owner' LIMIT 1)
      ) AS coordinator_id
    FROM tasks t
    WHERE t.status IN ('todo', 'in_progress')
      AND t.due_at < (now() - interval '24 hours')
      AND t.deleted_at IS NULL
  `);

  const affectedCircles = new Set<string>();
  let escalatedCount = 0;

  for (const task of overdueTasks.rows) {
    if (!task.coordinator_id) continue;
    affectedCircles.add(task.circle_id);

    // Enqueue escalation reminder to coordinator via frozen idempotent contract
    await adminDb.execute(sql`
      SELECT enqueue_reminder(
        ${task.circle_id}::uuid,
        ${task.coordinator_id}::uuid,
        'task_due'::reminder_kind,
        'email'::notification_channel,
        'task',
        ${task.task_id}::uuid,
        now(),
        '{"escalated": true}'::jsonb
      )
    `);

    await adminDb.execute(sql`
      SELECT enqueue_reminder(
        ${task.circle_id}::uuid,
        ${task.coordinator_id}::uuid,
        'task_due'::reminder_kind,
        'push'::notification_channel,
        'task',
        ${task.task_id}::uuid,
        now(),
        '{"escalated": true}'::jsonb
      )
    `);

    escalatedCount++;
  }

  // Bump versions for live updates
  for (const circleId of affectedCircles) {
    await bumpCircleVersion(circleId);
  }

  return {
    overdueFound: overdueTasks.rows.length,
    escalatedCount,
    affectedCircles: affectedCircles.size,
  };
}
