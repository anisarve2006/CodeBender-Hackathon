'use client';

import * as React from 'react';
import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Calendar, FileText, Lock, MessageSquare, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { loadTimelinePageAction } from '@/app/(app)/c/[circleId]/timeline/actions';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import type { TimelineItem, TimelineKind } from '@/lib/data/timeline';

type FilterValue = 'all' | TimelineKind;

const FILTER_CHIPS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'appointment', label: 'Appointments' },
  { value: 'prescription', label: 'Prescriptions' },
  { value: 'document', label: 'Reports' },
  { value: 'update', label: 'Updates' },
];

const PAGE_SIZE = 20;

interface TimelineFeedProps {
  circleId: string;
  timezone: string;
}

function iconFor(kind: TimelineKind) {
  switch (kind) {
    case 'appointment':
      return Calendar;
    case 'prescription':
      return Pill;
    case 'document':
      return FileText;
    case 'update':
      return MessageSquare;
  }
}

/** Where each kind is shown. Updates link to the Family page only (Member A owns that feature). */
function hrefFor(circleId: string, item: TimelineItem): string {
  switch (item.kind) {
    case 'appointment':
      return `/c/${circleId}/appointments`;
    case 'prescription':
      return `/c/${circleId}/meds`;
    case 'document':
      return `/c/${circleId}/documents`;
    case 'update':
      return `/c/${circleId}/family`;
  }
}

function labelFor(item: TimelineItem): string {
  switch (item.kind) {
    case 'appointment':
      return 'Appointment';
    case 'prescription':
      return 'Prescription';
    case 'document':
      return 'Report';
    case 'update':
      return 'Update';
  }
}

function monthLabel(value: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: timezone,
  }).format(new Date(value));
}

function dateTimeLabel(value: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(value));
}

export function TimelineFeed({ circleId, timezone }: TimelineFeedProps) {
  const [filter, setFilter] = React.useState<FilterValue>('all');
  const kinds = filter === 'all' ? undefined : [filter];

  const query = useInfiniteQuery({
    queryKey: [...queryKeys.timeline(circleId), filter],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const result = await loadTimelinePageAction({
        circleId,
        cursor: pageParam,
        kinds,
        limit: PAGE_SIZE,
      });
      if (!result.ok) {
        throw new Error(result.error);
      }
      return result.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  // Group by month, keeping the newest-first order from the database.
  const groups: { label: string; items: TimelineItem[] }[] = [];
  for (const item of items) {
    const label = monthLabel(item.occurredAt, timezone);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }

  return (
    <div className="space-y-6">
      <div role="group" aria-label="Filter timeline" className="flex flex-wrap gap-2">
        {FILTER_CHIPS.map((chip) => {
          const active = chip.value === filter;
          return (
            <button
              key={chip.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(chip.value)}
              className={cn(
                'inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium',
                active ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {query.isPending && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading timeline">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {query.isError && (
        <p role="alert" className="text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : 'The timeline could not be loaded.'}
        </p>
      )}

      {query.isSuccess && items.length === 0 && (
        <EmptyState
          title="Nothing on the timeline yet"
          description="Appointments, prescriptions, reports and updates will appear here in date order."
          icon={Calendar}
        />
      )}

      {groups.map((group) => (
        <section key={group.label} aria-label={group.label} className="space-y-2">
          <h2 className="sticky top-0 z-10 bg-background/95 py-2 text-sm font-semibold text-muted-foreground backdrop-blur">
            {group.label}
          </h2>
          <ol className="space-y-2">
            {group.items.map((item) => {
              const Icon = iconFor(item.kind);
              const restricted = item.sensitivity === 'restricted';
              const subtitle =
                item.kind === 'document' ? item.subtitle.replace(/_/g, ' ') : item.subtitle;

              return (
                <li key={`${item.kind}-${item.id}`}>
                  <Link
                    href={hrefFor(circleId, item)}
                    className="flex min-h-11 items-start gap-3 rounded-lg border bg-card p-3 text-card-foreground shadow-sm hover:bg-muted/50"
                  >
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {labelFor(item)} · {dateTimeLabel(item.occurredAt, timezone)}
                      </p>
                      <p className="flex items-center gap-2 break-words font-medium">
                        {restricted && (
                          <Lock className="h-4 w-4 shrink-0" aria-label="Restricted" />
                        )}
                        <span className="break-words">{item.title}</span>
                      </p>
                      {subtitle && (
                        <p className="break-words text-sm text-muted-foreground">{subtitle}</p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      {query.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
