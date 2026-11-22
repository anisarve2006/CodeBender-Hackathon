import { withUserTx } from '@/db/client';
import { sql } from 'drizzle-orm';
import type { CircleContext } from '@/lib/types/app';

export interface TimelineItem {
  id: string;
  kind: 'appointment' | 'prescription' | 'document' | 'update';
  occurredAt: string;
  title: string;
  subtitle: string;
  actorId: string | null;
  actorName: string;
  sensitivity: 'normal' | 'restricted';
}

export interface TimelinePageResult {
  items: TimelineItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Fetches cursor-paginated timeline items for a care circle
 * using the frozen circle_timeline() SQL contract.
 */
export async function getCircleTimelineFeed(
  ctx: CircleContext,
  options?: {
    cursor?: string | null;
    kinds?: string[] | null;
    limit?: number;
  },
): Promise<TimelinePageResult> {
  const limit = options?.limit ?? 20;
  const cursor = options?.cursor ? new Date(options.cursor).toISOString() : null;
  const kinds = options?.kinds && options.kinds.length > 0 ? options.kinds : null;

  return withUserTx(ctx.userId, async (tx) => {
    const result = await tx.execute<{
      kind: 'appointment' | 'prescription' | 'document' | 'update';
      id: string;
      occurred_at: string;
      title: string;
      subtitle: string;
      actor_id: string | null;
      actor_name: string | null;
      sensitivity: 'normal' | 'restricted';
    }>(sql`
      SELECT
        t.kind,
        t.id,
        t.occurred_at::text,
        t.title,
        t.subtitle,
        t.actor_id,
        COALESCE(u.full_name, 'Family Member') AS actor_name,
        t.sensitivity
      FROM circle_timeline(
        ${ctx.circleId}::uuid,
        ${cursor}::timestamptz,
        ${kinds}::text[],
        ${limit + 1}::int
      ) t
      LEFT JOIN member_profiles u ON t.actor_id = u.id
    `);

    const rows = result.rows;
    const hasMore = rows.length > limit;
    const pageItems = hasMore ? rows.slice(0, limit) : rows;

    const items: TimelineItem[] = pageItems.map((r) => ({
      id: r.id,
      kind: r.kind,
      occurredAt: r.occurred_at,
      title: r.title,
      subtitle: r.subtitle,
      actorId: r.actor_id,
      actorName: r.actor_name || 'Family Member',
      sensitivity: r.sensitivity,
    }));

    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1].occurredAt : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  });
}
