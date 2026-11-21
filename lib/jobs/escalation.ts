import 'server-only';
import { sql } from 'drizzle-orm';
import { adminDb } from '@/db/admin';

export type EscalationJobResult = {
  tasksChecked: number;
  escalationsQueued: number;
};

export async function runEscalationJob(): Promise<EscalationJobResult> {
  const result: EscalationJobResult = {
    tasksChecked: 0,
    escalationsQueued: 0,
  };

  // Find tasks overdue > 24h that haven't been completed or cancelled
  const overdueTasks = await adminDb.execute<{
    id: string;
    circle_id: string;
    title: string;
    due_at: string;
    assigned_to: string | null;
  }>(sql`
    SELECT
      t.id,
      t.circle_id,
      t.title,
      t.due_at,
      t.assigned_to
    FROM tasks t
    WHERE t.status IN ('todo', 'in_progress')
      AND t.due_at < (now() - interval '24 hours')
      AND t.deleted_at IS NULL;
  `);

  const tasks = overdueTasks.rows;
  result.tasksChecked = tasks.length;

  for (const task of tasks) {
    // Check if an escalation was already enqueued for this task
    const alreadyEscalated = await adminDb.execute<{ id: string }>(sql`
      SELECT id FROM reminders
      WHERE kind = 'escalation'::reminder_kind
        AND entity_type = 'task'
        AND entity_id = ${task.id}::uuid
      LIMIT 1;
    `);

    if (alreadyEscalated.rows.length > 0) {
      // Already escalated once; avoid duplicate spam
      continue;
    }

    // Find coordinator for this circle (fallback to owner)
    const coordinators = await adminDb.execute<{ user_id: string }>(sql`
      SELECT user_id FROM circle_members
      WHERE circle_id = ${task.circle_id}::uuid
        AND role IN ('coordinator', 'owner')
      ORDER BY CASE WHEN role = 'coordinator' THEN 1 ELSE 2 END
      LIMIT 1;
    `);

    if (coordinators.rows.length === 0) {
      continue;
    }

    const coordinatorId = coordinators.rows[0].user_id;

    // Enqueue escalation reminder
    await adminDb.execute(sql`
      INSERT INTO reminders (
        circle_id,
        target_user_id,
        kind,
        channel,
        entity_type,
        entity_id,
        remind_at,
        payload
      ) VALUES (
        ${task.circle_id}::uuid,
        ${coordinatorId}::uuid,
        'escalation'::reminder_kind,
        'email'::notification_channel,
        'task',
        ${task.id}::uuid,
        now(),
        '{}'::jsonb
      )
      ON CONFLICT (kind, entity_id, target_user_id, remind_at) DO NOTHING;
    `);

    result.escalationsQueued++;
  }

  return result;
}
