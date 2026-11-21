'use server';

/**
 * Tasks actions
 * Owner: Member A
 * Every mutation: requireCircleRole (role gate) → data function (withUserTx)
 * → bumpCircleVersion → revalidatePath. Read actions feed the client views.
 */

import { revalidatePath } from 'next/cache';
import { createAction } from '@/lib/utils/action';
import { requireCircleRole } from '@/lib/data/circle-context';
import { bumpCircleVersion } from '@/lib/live/version';
import { listCircleMembers } from '@/lib/data/members';
import {
  addTaskComment,
  claimTask,
  completeTask,
  createTask,
  getTaskBasics,
  getTaskDetail,
  listDoneTasks,
  reassignTask,
} from '@/lib/data/tasks';
import { nudgeTask } from '@/lib/data/nudges';
import {
  caregiverAssignmentError,
  circleIdSchema,
  commentTaskSchema,
  createTaskSchema,
  doneCursorSchema,
  reassignTaskSchema,
  taskRefSchema,
} from '@/lib/schemas/tasks';
import type { CircleRole } from '@/lib/types/app';

const CREATE_ROLES: CircleRole[] = ['owner', 'coordinator', 'caregiver'];
const ACTION_ROLES: CircleRole[] = ['owner', 'coordinator', 'caregiver'];
const ASSIGN_ROLES: CircleRole[] = ['owner', 'coordinator'];

function refreshTasks(circleId: string) {
  revalidatePath(`/c/${circleId}/tasks`);
  revalidatePath(`/c/${circleId}`);
}

/* ---------- Read actions (used by the client views) ---------- */

/** Role, own id and member list for the create form and assignee pickers. */
export const getTaskFormOptionsAction = createAction(circleIdSchema, async ({ circleId }) => {
  const ctx = await requireCircleRole(circleId);
  const members = await listCircleMembers(circleId, ctx.userId);
  return { role: ctx.role, userId: ctx.userId, members };
});

/** Next page of completed tasks. */
export const loadDoneTasksAction = createAction(doneCursorSchema, async ({ circleId, cursor }) => {
  const ctx = await requireCircleRole(circleId);
  return listDoneTasks(ctx, cursor ?? null);
});

/** One task with its comments and history, for the detail sheet. */
export const loadTaskDetailAction = createAction(taskRefSchema, async ({ circleId, taskId }) => {
  const ctx = await requireCircleRole(circleId);
  const detail = await getTaskDetail(ctx, taskId);
  if (!detail) {
    throw new Error('That task could not be found.');
  }
  return detail;
});

/* ---------- Mutations ---------- */

export const createTaskAction = createAction(
  createTaskSchema,
  async (data, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(data.circleId, CREATE_ROLES);

    // Caregivers may only assign to themselves; an omitted assignee defaults to them.
    const assignedTo =
      ctx.role === 'caregiver' ? (data.assignedTo ?? ctx.userId) : (data.assignedTo ?? null);

    const conflict = caregiverAssignmentError(ctx.role, ctx.userId, assignedTo);
    if (conflict) throw new Error(conflict);

    if (assignedTo && assignedTo !== ctx.userId) {
      const members = await listCircleMembers(ctx.circleId, ctx.userId);
      if (!members.some((member) => member.userId === assignedTo)) {
        throw new Error('That person is not a member of this circle.');
      }
    }

    const taskId = await createTask(ctx, {
      title: data.title,
      description: data.description || undefined,
      category: data.category,
      priority: data.priority,
      dueAt: data.dueAt,
      assignedTo,
      recurrenceRule: data.recurrenceRule === 'none' ? null : data.recurrenceRule,
    });

    await bumpCircleVersion(ctx.circleId);
    refreshTasks(ctx.circleId);
    return { taskId };
  },
  { auth: 'verified' },
);

export const claimTaskAction = createAction(
  taskRefSchema,
  async ({ circleId, taskId }, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(circleId, ACTION_ROLES);

    await claimTask(ctx, taskId);

    await bumpCircleVersion(ctx.circleId);
    refreshTasks(ctx.circleId);
    return { taskId };
  },
  { auth: 'verified' },
);

export const completeTaskAction = createAction(
  taskRefSchema,
  async ({ circleId, taskId }, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(circleId, ACTION_ROLES);

    // Caregivers complete only what is theirs; owners and coordinators may complete any task.
    const task = await getTaskBasics(ctx, taskId);
    if (ctx.role === 'caregiver' && task.assignedTo !== ctx.userId) {
      throw new Error('Claim this task before marking it done.');
    }

    await completeTask(ctx, taskId);

    await bumpCircleVersion(ctx.circleId);
    refreshTasks(ctx.circleId);
    return { taskId };
  },
  { auth: 'verified' },
);

export const reassignTaskAction = createAction(
  reassignTaskSchema,
  async ({ circleId, taskId, assignedTo }, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(circleId, ASSIGN_ROLES);

    await reassignTask(ctx, taskId, assignedTo);

    await bumpCircleVersion(ctx.circleId);
    refreshTasks(ctx.circleId);
    return { taskId };
  },
  { auth: 'verified' },
);

export const commentTaskAction = createAction(
  commentTaskSchema,
  async ({ circleId, taskId, body }, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(circleId, ACTION_ROLES);

    await addTaskComment(ctx, taskId, body);

    await bumpCircleVersion(ctx.circleId);
    refreshTasks(ctx.circleId);
    return { taskId };
  },
  { auth: 'verified' },
);

export const nudgeTaskAction = createAction(
  taskRefSchema,
  async ({ circleId, taskId }, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(circleId, ACTION_ROLES);

    await nudgeTask(ctx, taskId);

    await bumpCircleVersion(ctx.circleId);
    refreshTasks(ctx.circleId);
    return { taskId };
  },
  { auth: 'verified' },
);
