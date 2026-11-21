import 'server-only';
import { withUserTx } from '@/db/client';
import * as schema from '@/db/schema';
import type { CircleContext } from '@/lib/types/app';
import { bumpCircleVersion } from '@/lib/live/version';

export type TaskCoreInput = {
  title: string;
  description?: string;
  category?: 'medication' | 'appointment' | 'errand' | 'payment' | 'paperwork' | 'other';
  priority?: 'low' | 'normal' | 'high';
  dueAt?: Date;
  assignedTo?: string;
  linkedEntityType?: string;
  linkedEntityId?: string;
};

/**
 * Frozen contract: Member B calls this to create tasks linked to appointments and refills.
 */
export async function createTaskCore(
  ctx: CircleContext,
  input: TaskCoreInput,
): Promise<schema.Task> {
  const task = await withUserTx(ctx.userId, async (tx) => {
    const [inserted] = await tx
      .insert(schema.tasks)
      .values({
        circleId: ctx.circleId,
        title: input.title,
        description: input.description,
        category: input.category || 'other',
        priority: input.priority || 'normal',
        dueAt: input.dueAt,
        assignedTo: input.assignedTo,
        linkedEntityType: input.linkedEntityType,
        linkedEntityId: input.linkedEntityId,
        createdBy: ctx.userId,
      })
      .returning();
    return inserted;
  });

  await bumpCircleVersion(ctx.circleId);
  return task;
}
