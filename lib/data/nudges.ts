import 'server-only';
import type { CircleContext } from '@/lib/types/app';
import { redis } from '@/lib/utils/redis';
import { enqueueNotification } from '@/lib/notifications/enqueue';
import { getTaskBasics } from '@/lib/data/tasks';

/**
 * lib/data/nudges.ts
 * Owner: Member A
 * Nudges the assignee of an open task. At most once per 12 hours per task,
 * enforced with Redis SET NX EX. Without Redis configured, nudges are not
 * limited. Notification text is neutral: no task title, medicine or document name.
 */

const NUDGE_WINDOW_SECONDS = 12 * 60 * 60;

export async function nudgeTask(ctx: CircleContext, taskId: string): Promise<void> {
  const task = await getTaskBasics(ctx, taskId);

  if (!task.assignedTo) {
    throw new Error('Assign this task to someone before nudging.');
  }
  if (task.status === 'done' || task.status === 'cancelled') {
    throw new Error('This task is already closed.');
  }

  const key = `nudge:task:${taskId}`;
  if (redis) {
    try {
      const first = await redis.set(key, '1', { nx: true, ex: NUDGE_WINDOW_SECONDS });
      if (first === null) {
        throw new Error('This task was nudged recently. Please wait a few hours before nudging again.');
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('This task was nudged')) throw err;
      console.warn('Nudge limiter unavailable; allowing nudge:', err);
    }
  }

  const remindAt = new Date();
  const payload = {
    title: 'Kinly',
    body: 'A care task is waiting for you. Open Kinly to see it.',
  };

  try {
    await Promise.all(
      (['email', 'push'] as const).map((channel) =>
        enqueueNotification(ctx, {
          targetUserId: task.assignedTo as string,
          kind: 'nudge',
          channel,
          entityType: 'task',
          entityId: taskId,
          remindAt,
          payload,
        }),
      ),
    );
  } catch (err) {
    if (redis) {
      await redis.del(key).catch(() => undefined);
    }
    throw err;
  }
}
