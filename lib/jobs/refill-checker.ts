import { adminDb } from '@/db/admin';
import { sql } from 'drizzle-orm';
import { bumpCircleVersion } from '@/lib/live/version';
import { tasks } from '@/db/schema/tasks';

interface RefillDueRow extends Record<string, unknown> {
  refill_id: string;
  circle_id: string;
  circle_name: string;
  medication_id: string;
  medication_name: string;
  status: 'ok' | 'due_soon' | 'overdue' | 'ordered';
  next_refill_due: string | null;
  coordinator_id: string;
}

/**
 * Scheduled Job: Daily Refill Status Evaluation
 * - Recomputes next_refill_due and updates refill statuses
 * - Automatically creates a task for due_soon / overdue refills (unless an open task already exists)
 * - Enqueues idempotent reminders to caregivers when overdue
 * - Calls bumpCircleVersion for all affected circles
 */
export async function runRefillChecker() {
  // 1. Refresh statuses for active, non-ordered refills
  await adminDb.execute(sql`
    UPDATE refills
    SET status = CASE
      WHEN next_refill_due IS NULL THEN 'ok'::refill_status
      WHEN next_refill_due < CURRENT_DATE THEN 'overdue'::refill_status
      WHEN next_refill_due <= (CURRENT_DATE + interval '5 days')::date THEN 'due_soon'::refill_status
      ELSE 'ok'::refill_status
    END
    WHERE status != 'ordered'
  `);

  // 2. Fetch refills that are due_soon or overdue
  const dueRefills = await adminDb.execute<RefillDueRow>(sql`
    SELECT
      r.id AS refill_id,
      r.circle_id,
      c.name AS circle_name,
      r.medication_id,
      m.name AS medication_name,
      r.status,
      r.next_refill_due::text,
      COALESCE(
        (SELECT cm.user_id FROM circle_members cm WHERE cm.circle_id = r.circle_id AND cm.role = 'coordinator' LIMIT 1),
        (SELECT cm.user_id FROM circle_members cm WHERE cm.circle_id = r.circle_id AND cm.role = 'owner' LIMIT 1)
      ) AS coordinator_id
    FROM refills r
    JOIN medications m ON r.medication_id = m.id
    JOIN care_circles c ON r.circle_id = c.id
    WHERE r.status IN ('due_soon', 'overdue')
      AND m.is_active = true
  `);

  const affectedCircles = new Set<string>();
  let tasksCreated = 0;
  let remindersEnqueued = 0;

  for (const row of dueRefills.rows) {
    if (!row.coordinator_id) continue;
    affectedCircles.add(row.circle_id);

    // 3. Check if an open task already exists for this refill
    const existingTask = await adminDb.execute(sql`
      SELECT id FROM tasks
      WHERE circle_id = ${row.circle_id}
        AND linked_entity_type = 'refill'
        AND linked_entity_id = ${row.refill_id}
        AND status IN ('todo', 'in_progress')
        AND deleted_at IS NULL
      LIMIT 1
    `);

    if (existingTask.rows.length === 0) {
      // Create a task
      // Guardrail note: Task title is visible in tasks board ("Refill medication prescription")
      await adminDb.insert(tasks).values({
        circleId: row.circle_id,
        title: `Refill prescription for ${row.medication_name}`,
        description: 'Verify current remaining supply and order replacement from pharmacy.',
        category: 'medication',
        priority: row.status === 'overdue' ? 'high' : 'normal',
        dueAt: row.next_refill_due ? new Date(row.next_refill_due) : new Date(),
        assignedTo: row.coordinator_id,
        createdBy: row.coordinator_id,
        linkedEntityType: 'refill',
        linkedEntityId: row.refill_id,
      });
      tasksCreated++;
    }

    // 4. If overdue, enqueue idempotent reminders to caregivers & coordinator
    if (row.status === 'overdue') {
      const caregivers = await adminDb.execute<{ user_id: string }>(sql`
        SELECT user_id FROM circle_members
        WHERE circle_id = ${row.circle_id}
          AND role IN ('owner', 'coordinator', 'caregiver')
      `);

      for (const cg of caregivers.rows) {
        // Enqueue email and push reminders
        await adminDb.execute(sql`
          SELECT enqueue_reminder(
            ${row.circle_id}::uuid,
            ${cg.user_id}::uuid,
            'task_due'::reminder_kind,
            'email'::notification_channel,
            'refill',
            ${row.refill_id}::uuid,
            now()
          )
        `);

        await adminDb.execute(sql`
          SELECT enqueue_reminder(
            ${row.circle_id}::uuid,
            ${cg.user_id}::uuid,
            'task_due'::reminder_kind,
            'push'::notification_channel,
            'refill',
            ${row.refill_id}::uuid,
            now()
          )
        `);
        remindersEnqueued++;
      }
    }
  }

  // 5. Bump circle versions for reactivity
  for (const circleId of affectedCircles) {
    await bumpCircleVersion(circleId);
  }

  return {
    evaluated: dueRefills.rows.length,
    tasksCreated,
    remindersEnqueued,
    affectedCircles: affectedCircles.size,
  };
}
