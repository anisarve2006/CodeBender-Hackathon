import 'server-only';
import { sql } from 'drizzle-orm';
import { withUserTx } from '@/db/client';
import { requireCircleRole } from '@/lib/data/circle-context';

export const TIMELINE_KINDS = ['appointment', 'prescription', 'document', 'update'] as const;
export type TimelineKind = (typeof TIMELINE_KINDS)[number];

export const TIMELINE_PAGE_SIZE = 20;

export type TimelineItem = {
  kind: TimelineKind;
  id: string;
  occurredAt: string;
  title: string;
  subtitle: string;
  actorId: string | null;
  sensitivity: 'normal' | 'restricted';
};

export type TimelinePage = {
  items: TimelineItem[];
  nextCursor: string | null;
};

type TimelineRow = {
  kind: string;
  id: string;
  occurred_at: Date | string;
  title: string;
  subtitle: string | null;
  actor_id: string | null;
  sensitivity: 'normal' | 'restricted';
};

/**
 * One page of the unified timeline via circle_timeline(p_circle, p_cursor, p_kinds, p_limit).
 * Pagination is by occurred_at: pass the returned nextCursor back as `cursor`.
 * Documents the viewer may not see are masked as "Restricted document" by the SQL function.
 */
export async function listTimelinePage(
  circleId: string,
  options: { cursor?: string; kinds?: TimelineKind[]; limit?: number } = {},
): Promise<TimelinePage> {
  const ctx = await requireCircleRole(circleId);
  const limit = Math.min(Math.max(options.limit ?? TIMELINE_PAGE_SIZE, 1), 50);
  const cursorDate = options.cursor ? new Date(options.cursor) : null;
  const kinds = options.kinds && options.kinds.length > 0 ? options.kinds : null;

  // Fetch one extra row to know whether another page exists.
  const kindsParam = kinds
    ? sql`ARRAY[${sql.join(
        kinds.map((kind) => sql`${kind}`),
        sql`, `,
      )}]::text[]`
    : sql`NULL::text[]`;

  const result = await withUserTx(ctx.userId, (tx) =>
    tx.execute<TimelineRow>(
      sql`SELECT kind, id, occurred_at, title, subtitle, actor_id, sensitivity
          FROM circle_timeline(
            ${circleId}::uuid,
            ${cursorDate}::timestamptz,
            ${kindsParam},
            ${limit + 1}::int
          )`,
    ),
  );

  const rows = result.rows;
  const hasMore = rows.length > limit;
  const visible = hasMore ? rows.slice(0, limit) : rows;

  const items: TimelineItem[] = visible.map((row) => ({
    kind: row.kind as TimelineKind,
    id: row.id,
    occurredAt: new Date(row.occurred_at).toISOString(),
    title: row.title,
    subtitle: row.subtitle ?? '',
    actorId: row.actor_id,
    sensitivity: row.sensitivity,
  }));

  const last = items[items.length - 1];
  return {
    items,
    nextCursor: hasMore && last ? last.occurredAt : null,
  };
}
