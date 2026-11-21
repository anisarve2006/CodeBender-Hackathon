import 'server-only';
import { and, eq } from 'drizzle-orm';
import { withUserTx } from '@/db/client';
import * as schema from '@/db/schema';
import type { CircleContext } from '@/lib/types/app';
import { bumpCircleVersion } from '@/lib/live/version';
import type { MarkRefillRefilledInput } from '@/lib/schemas/refills';
import {
  nextRefillDueFrom,
  refillStatusAfterOrder,
  refillStatusAfterRefill,
  todayIsoDate,
} from '@/lib/utils/refill-math';

/**
 * Refill tracker mutations. Owner: Member B.
 * Countdown math uses only the stored quantity_on_hand and daily_usage.
 */

/** Marks a refill as ordered. The status stays `ordered` until a refill is recorded. */
export async function markRefillOrdered(ctx: CircleContext, refillId: string) {
  const updated = await withUserTx(ctx.userId, async (tx) => {
    const [row] = await tx
      .update(schema.refills)
      .set({ status: refillStatusAfterOrder(), updatedAt: new Date() })
      .where(and(eq(schema.refills.id, refillId), eq(schema.refills.circleId, ctx.circleId)))
      .returning();
    return row;
  });

  if (!updated) {
    throw new Error('Refill not found.');
  }

  await bumpCircleVersion(ctx.circleId);
  return updated;
}

/**
 * Records a refill: sets the new quantity on hand, the refill date and the next due date
 * (refill date + whole days of supply), and marks the status as refilled.
 */
export async function markRefillRefilled(ctx: CircleContext, input: MarkRefillRefilledInput) {
  const refilledOn = input.refilledOn ?? todayIsoDate();

  const updated = await withUserTx(ctx.userId, async (tx) => {
    const [current] = await tx
      .select({ id: schema.refills.id, dailyUsage: schema.refills.dailyUsage })
      .from(schema.refills)
      .where(and(eq(schema.refills.id, input.refillId), eq(schema.refills.circleId, ctx.circleId)))
      .limit(1);

    if (!current) {
      return undefined;
    }

    const [row] = await tx
      .update(schema.refills)
      .set({
        quantityOnHand: input.newQuantity,
        lastRefilledOn: refilledOn,
        nextRefillDue: nextRefillDueFrom(refilledOn, input.newQuantity, current.dailyUsage),
        status: refillStatusAfterRefill(),
        updatedAt: new Date(),
      })
      .where(eq(schema.refills.id, current.id))
      .returning();
    return row;
  });

  if (!updated) {
    throw new Error('Refill not found.');
  }

  await bumpCircleVersion(ctx.circleId);
  return updated;
}
