'use server';

/**
 * Timeline actions
 * Owner: Member B
 */
import { z } from 'zod';
import { createAction } from '@/lib/utils/action';
import { listTimelinePage, TIMELINE_KINDS } from '@/lib/data/timeline';

const timelinePageSchema = z.object({
  circleId: z.string().uuid(),
  cursor: z.iso.datetime({ offset: true }).optional(),
  kinds: z.array(z.enum(TIMELINE_KINDS)).max(TIMELINE_KINDS.length).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

/** Loads one cursor-paginated page of the circle timeline for the infinite list. */
export const loadTimelinePageAction = createAction(
  timelinePageSchema,
  async (data) =>
    listTimelinePage(data.circleId, {
      cursor: data.cursor,
      kinds: data.kinds,
      limit: data.limit,
    }),
  { auth: 'verified' },
);
