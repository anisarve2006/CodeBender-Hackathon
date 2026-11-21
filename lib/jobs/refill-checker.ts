import 'server-only';
import { sql } from 'drizzle-orm';
import { adminDb } from '@/db/admin';

export type RefillCheckerResult = {
  recalculated: number;
  tasksCreated: number;
  remindersQueued: number;
};

export async function runRefillCheckerJob(): Promise<RefillCheckerResult> {
  const result: RefillCheckerResult = {
    recalculated: 0,
    tasksCreated: 0,
    remindersQueued: 0,
  };

  // 1. Recalculate refill statuses based on current date
  const updatedRefills = await adminDb.execute<{
    id: string;
    circle_id: string;
    medication_id: string;
    medication_name: string;
    assigned_to: string | null;
    next_refill_due: string;
    status: string;
  }>(sql`
    UPDATE refills r
    SET status = CASE
      WHEN r.status = 'ordered' THEN 'ordered'
      WHEN r.next_refill_due < CURRENT_DATE THEN 'overdue'::refill_status
      WHEN r.next_refill_due <= (CURRENT_DATE + 5) THEN 'due_soon'::refill_status
      ELSE 'ok'::refill_status
    END
    FROM medications m
    WHERE r.medication_id = m.id
      AND m.is_active = true
      AND m.deleted_at IS NULL
    RETURNING r.id, r.circle_id, r.medication_id, m.name AS medication_name, r.assigned_to, r.next_refill_due, r.status;
  `);

  const rows = updatedRefills.rows;
  result.recalculated = rows.length;

  for (const refill of rows) {
    if (refill.status !== 'due_soon' && refill.status !== 'overdue') {
      continue;
    }

    // 2. Check if an open task exists for this refill to prevent duplicate task spam
    const existingTask = await adminDb.execute<{ id: string }>(sql`
      SELECT id FROM tasks
      WHERE circle_id = ${refill.circle_id}::uuid
        AND linked_entity_type = 'refill'
        AND linked_entity_id = ${refill.id}::uuid
        AND status IN ('todo', 'in_progress')
        AND deleted_at IS NULL
      LIMIT 1;
    `);

    if (existingTask.rows.length === 0) {
      // Find default assignee if refill has none (coordinator or owner)
      let assignee = refill.assigned_to;
      if (!assignee) {
        const fallback = await adminDb.execute<{ user_id: string }>(sql`
          SELECT user_id FROM circle_members
          WHERE circle_id = ${refill.circle_id}::uuid
            AND role IN ('coordinator', 'owner')
          ORDER BY CASE WHEN role = 'coordinator' THEN 1 ELSE 2 END
          LIMIT 1;
        `);
        if (fallback.rows.length > 0) {
          assignee = fallback.rows[0].user_id;
        }
      }

      // Create linked task
      await adminDb.execute(sql`
        INSERT INTO tasks (
          circle_id,
          title,
          description,
          category,
          priority,
          status,
          due_at,
          assigned_to,
          linked_entity_type,
          linked_entity_id,
          created_by
        ) VALUES (
          ${refill.circle_id}::uuid,
          ${'Refill medication: ' + refill.medication_name},
          ${'Stock running low. Please check current inventory and order refill.'},
          'medication'::task_category,
          ${refill.status === 'overdue' ? 'high' : 'normal'}::task_priority,
          'todo'::task_status,
          ${refill.next_refill_due}::timestamptz,
          ${assignee ? sql`${assignee}::uuid` : sql`NULL`},
          'refill',
          ${refill.id}::uuid,
          ${assignee ? sql`${assignee}::uuid` : sql`(SELECT created_by FROM care_circles WHERE id = ${refill.circle_id}::uuid)`}
        );
      `);
      result.tasksCreated++;
    }

    // 3. If overdue, enqueue reminders for caregivers and coordinators
    if (refill.status === 'overdue') {
      const caregivers = await adminDb.execute<{ user_id: string }>(sql`
        SELECT user_id FROM circle_members
        WHERE circle_id = ${refill.circle_id}::uuid
          AND role IN ('owner', 'coordinator', 'caregiver');
      `);

      for (const cg of caregivers.rows) {
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
            ${refill.circle_id}::uuid,
            ${cg.user_id}::uuid,
            'refill'::reminder_kind,
            'email'::notification_channel,
            'refill',
            ${refill.id}::uuid,
            now(),
            '{}'::jsonb
          )
          ON CONFLICT (kind, entity_id, target_user_id, remind_at) DO NOTHING;
        `);
        result.remindersQueued++;
      }
    }
  }

  return result;
}
