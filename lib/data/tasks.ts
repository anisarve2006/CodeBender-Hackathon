import 'server-only';
import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { withUserTx, type AppTransaction } from '@/db/client';
import * as schema from '@/db/schema';
import type { CircleContext } from '@/lib/types/app';
import type {
  CommentView,
  DoneCursor,
  DonePage,
  HistoryView,
  TaskDetail,
  TaskView,
} from '@/components/features/tasks/types';

/**
 * lib/data/tasks.ts
 * Owner: Member A
 * Task list, detail, comments, history and mutations.
 * Every query runs inside withUserTx so Postgres RLS applies.
 * Callers (server actions) check roles and call bumpCircleVersion afterwards.
 */

const OPEN_STATUSES = ['todo', 'in_progress'] as const;
const OPEN_LIMIT = 300;
const DONE_PAGE_SIZE = 20;
const HISTORY_LIMIT = 50;
const COMMENT_LIMIT = 200;

const assignee = alias(schema.users, 'assignee');
const completer = alias(schema.users, 'completer');

const taskColumns = {
  id: schema.tasks.id,
  title: schema.tasks.title,
  description: schema.tasks.description,
  category: schema.tasks.category,
  priority: schema.tasks.priority,
  status: schema.tasks.status,
  dueAt: schema.tasks.dueAt,
  assignedTo: schema.tasks.assignedTo,
  assigneeName: assignee.fullName,
  completedBy: schema.tasks.completedBy,
  completedByName: completer.fullName,
  completedAt: schema.tasks.completedAt,
  linkedEntityType: schema.tasks.linkedEntityType,
  linkedEntityId: schema.tasks.linkedEntityId,
  recurrenceRule: schema.tasks.recurrenceRule,
  createdBy: schema.tasks.createdBy,
  createdAt: schema.tasks.createdAt,
};

function taskQuery(tx: AppTransaction) {
  return tx
    .select(taskColumns)
    .from(schema.tasks)
    .leftJoin(assignee, eq(schema.tasks.assignedTo, assignee.id))
    .leftJoin(completer, eq(schema.tasks.completedBy, completer.id));
}

export type TaskBasics = { id: string; assignedTo: string | null; status: string };

/** Loads a live task in this circle inside an existing transaction, or throws. */
async function loadTaskBasics(
  tx: AppTransaction,
  ctx: CircleContext,
  taskId: string,
): Promise<TaskBasics> {
  const rows = await tx
    .select({
      id: schema.tasks.id,
      assignedTo: schema.tasks.assignedTo,
      status: schema.tasks.status,
    })
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.id, taskId),
        eq(schema.tasks.circleId, ctx.circleId),
        isNull(schema.tasks.deletedAt),
      ),
    )
    .limit(1);

  if (rows.length === 0) {
    throw new Error('That task could not be found.');
  }
  return rows[0];
}

export async function getTaskBasics(ctx: CircleContext, taskId: string): Promise<TaskBasics> {
  return withUserTx(ctx.userId, (tx) => loadTaskBasics(tx, ctx, taskId));
}

/** All open tasks in the circle, earliest due first (tasks without a due date last). */
export async function listOpenTasks(ctx: CircleContext): Promise<TaskView[]> {
  return withUserTx(ctx.userId, (tx) =>
    taskQuery(tx)
      .where(
        and(
          eq(schema.tasks.circleId, ctx.circleId),
          inArray(schema.tasks.status, [...OPEN_STATUSES]),
          isNull(schema.tasks.deletedAt),
        ),
      )
      .orderBy(sql`${schema.tasks.dueAt} ASC NULLS LAST`, desc(schema.tasks.createdAt))
      .limit(OPEN_LIMIT),
  );
}

/** Completed tasks, newest first, with keyset pagination on (completed_at, id). */
export async function listDoneTasks(
  ctx: CircleContext,
  cursor?: DoneCursor | null,
): Promise<DonePage> {
  const cursorAt = cursor ? new Date(cursor.completedAt) : null;
  const cursorCondition =
    cursor && cursorAt
      ? or(
          lt(schema.tasks.completedAt, cursorAt),
          and(eq(schema.tasks.completedAt, cursorAt), lt(schema.tasks.id, cursor.id)),
        )
      : undefined;

  const rows = await withUserTx(ctx.userId, (tx) =>
    taskQuery(tx)
      .where(
        and(
          eq(schema.tasks.circleId, ctx.circleId),
          eq(schema.tasks.status, 'done'),
          isNull(schema.tasks.deletedAt),
          cursorCondition,
        ),
      )
      .orderBy(desc(schema.tasks.completedAt), desc(schema.tasks.id))
      .limit(DONE_PAGE_SIZE + 1),
  );

  const hasMore = rows.length > DONE_PAGE_SIZE;
  const items = rows.slice(0, DONE_PAGE_SIZE);
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last?.completedAt ? { completedAt: last.completedAt.toISOString(), id: last.id } : null;

  return { items, nextCursor };
}

/** Task with its comments and its own history from activity_log (entity_type 'tasks'). */
export async function getTaskDetail(ctx: CircleContext, taskId: string): Promise<TaskDetail | null> {
  return withUserTx(ctx.userId, async (tx) => {
    const [task] = await taskQuery(tx)
      .where(
        and(
          eq(schema.tasks.id, taskId),
          eq(schema.tasks.circleId, ctx.circleId),
          isNull(schema.tasks.deletedAt),
        ),
      )
      .limit(1);

    if (!task) return null;

    const comments: CommentView[] = await tx
      .select({
        id: schema.taskComments.id,
        body: schema.taskComments.body,
        authorName: schema.users.fullName,
        createdAt: schema.taskComments.createdAt,
      })
      .from(schema.taskComments)
      .leftJoin(schema.users, eq(schema.taskComments.authorId, schema.users.id))
      .where(
        and(
          eq(schema.taskComments.taskId, taskId),
          eq(schema.taskComments.circleId, ctx.circleId),
        ),
      )
      .orderBy(asc(schema.taskComments.createdAt))
      .limit(COMMENT_LIMIT);

    const history: HistoryView[] = await tx
      .select({
        id: schema.activityLog.id,
        action: schema.activityLog.action,
        summary: schema.activityLog.summary,
        actorName: schema.users.fullName,
        createdAt: schema.activityLog.createdAt,
      })
      .from(schema.activityLog)
      .leftJoin(schema.users, eq(schema.activityLog.actorId, schema.users.id))
      .where(
        and(
          eq(schema.activityLog.circleId, ctx.circleId),
          eq(schema.activityLog.entityType, 'tasks'),
          eq(schema.activityLog.entityId, taskId),
        ),
      )
      .orderBy(desc(schema.activityLog.createdAt))
      .limit(HISTORY_LIMIT);

    return { task, comments, history };
  });
}

export async function addTaskComment(
  ctx: CircleContext,
  taskId: string,
  body: string,
): Promise<void> {
  await withUserTx(ctx.userId, async (tx) => {
    await loadTaskBasics(tx, ctx, taskId);
    await tx.insert(schema.taskComments).values({
      taskId,
      circleId: ctx.circleId,
      authorId: ctx.userId,
      body,
    });
  });
}

export type NewTaskInput = {
  title: string;
  description?: string;
  category: 'medication' | 'appointment' | 'errand' | 'payment' | 'paperwork' | 'other';
  priority: 'low' | 'normal' | 'high';
  dueAt?: Date;
  assignedTo: string | null;
  recurrenceRule: 'daily' | 'weekly' | 'monthly' | null;
};

/** Inserts a task. Stores recurrence_rule, which createTaskCore does not write. */
export async function createTask(ctx: CircleContext, input: NewTaskInput): Promise<string> {
  return withUserTx(ctx.userId, async (tx) => {
    const [inserted] = await tx
      .insert(schema.tasks)
      .values({
        circleId: ctx.circleId,
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        priority: input.priority,
        dueAt: input.dueAt ?? null,
        assignedTo: input.assignedTo,
        recurrenceRule: input.recurrenceRule,
        createdBy: ctx.userId,
      })
      .returning({ id: schema.tasks.id });
    return inserted.id;
  });
}

/** Sets or clears the assignee. The new assignee must be a member of this circle. */
export async function reassignTask(
  ctx: CircleContext,
  taskId: string,
  assignedTo: string | null,
): Promise<void> {
  await withUserTx(ctx.userId, async (tx) => {
    const task = await loadTaskBasics(tx, ctx, taskId);
    if (!(OPEN_STATUSES as readonly string[]).includes(task.status)) {
      throw new Error('Closed tasks cannot be reassigned.');
    }

    if (assignedTo) {
      const member = await tx
        .select({ userId: schema.circleMembers.userId })
        .from(schema.circleMembers)
        .where(
          and(
            eq(schema.circleMembers.circleId, ctx.circleId),
            eq(schema.circleMembers.userId, assignedTo),
          ),
        )
        .limit(1);
      if (member.length === 0) {
        throw new Error('That person is not a member of this circle.');
      }
    }

    await tx
      .update(schema.tasks)
      .set({ assignedTo, updatedAt: new Date() })
      .where(eq(schema.tasks.id, taskId));
  });
}

/** Claims an unassigned task for the caller via the claim_task() SQL contract. */
export async function claimTask(ctx: CircleContext, taskId: string): Promise<void> {
  await withUserTx(ctx.userId, async (tx) => {
    const task = await loadTaskBasics(tx, ctx, taskId);
    if (!(OPEN_STATUSES as readonly string[]).includes(task.status)) {
      throw new Error('This task is already closed.');
    }

    await tx.execute(sql`SELECT claim_task(${taskId}::uuid)`);

    const after = await loadTaskBasics(tx, ctx, taskId);
    if (after.assignedTo !== ctx.userId) {
      throw new Error('Someone else has already claimed this task.');
    }
  });
}

/** Marks a task done via the complete_task() SQL contract. */
export async function completeTask(ctx: CircleContext, taskId: string): Promise<void> {
  await withUserTx(ctx.userId, async (tx) => {
    await loadTaskBasics(tx, ctx, taskId);

    await tx.execute(sql`SELECT complete_task(${taskId}::uuid)`);

    const after = await loadTaskBasics(tx, ctx, taskId);
    if (after.status !== 'done') {
      throw new Error('You cannot complete this task.');
    }
  });
}
