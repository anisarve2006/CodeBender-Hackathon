import 'server-only';
import { sql } from 'drizzle-orm';
import { withUserTx } from '@/db/client';
import type { CircleContext } from '@/lib/types/app';
import type { reminderKindEnum, notificationChannelEnum } from '@/db/schema/enums';

export type EnqueueNotificationInput = {
  targetUserId: string;
  kind: (typeof reminderKindEnum.enumValues)[number];
  channel: (typeof notificationChannelEnum.enumValues)[number];
  entityType: string;
  entityId: string;
  remindAt: Date;
  payload?: Record<string, unknown>;
};

/**
 * Frozen contract: Member A calls this for nudges; Member B handles delivery.
 */
export async function enqueueNotification(
  ctxOrCircle: CircleContext | { circleId: string; userId: string },
  input: EnqueueNotificationInput,
): Promise<void> {
  await withUserTx(ctxOrCircle.userId, async (tx) => {
    await tx.execute(sql`
      SELECT enqueue_reminder(
        ${ctxOrCircle.circleId}::uuid,
        ${input.targetUserId}::uuid,
        ${input.kind}::reminder_kind,
        ${input.channel}::notification_channel,
        ${input.entityType},
        ${input.entityId}::uuid,
        ${input.remindAt.toISOString()}::timestamptz,
        ${JSON.stringify(input.payload || {})}::jsonb
      );
    `);
  });
}
