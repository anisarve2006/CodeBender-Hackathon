'use client';

import * as React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { TimelineItemCard } from './timeline-item-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Activity, Calendar, Pill, FileText, MessageSquare, Loader2 } from 'lucide-react';
import type { TimelineItem, TimelinePageResult } from '@/lib/data/timeline';

interface TimelineViewProps {
  circleId: string;
  initialPage: TimelinePageResult;
}

type FilterOption = 'all' | 'appointment' | 'prescription' | 'document' | 'update';

const FILTER_CHIPS: { label: string; value: FilterOption; icon: React.ElementType }[] = [
  { label: 'All Activity', value: 'all', icon: Activity },
  { label: 'Appointments', value: 'appointment', icon: Calendar },
  { label: 'Prescriptions', value: 'prescription', icon: Pill },
  { label: 'Reports & Files', value: 'document', icon: FileText },
  { label: 'Family Updates', value: 'update', icon: MessageSquare },
];

function getMonthKey(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function TimelineView({ circleId, initialPage }: TimelineViewProps) {
  const [activeFilter, setActiveFilter] = React.useState<FilterOption>('all');
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['timeline', circleId, activeFilter],
    queryFn: async ({ pageParam }) => {
      const url = new URL(`/api/circles/${circleId}/timeline`, window.location.origin);
      if (pageParam) url.searchParams.set('cursor', pageParam);
      if (activeFilter !== 'all') url.searchParams.set('kinds', activeFilter);
      url.searchParams.set('limit', '20');

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to load timeline entries');
      return (await res.json()) as TimelinePageResult;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    initialData:
      activeFilter === 'all'
        ? {
            pages: [initialPage],
            pageParams: [null],
          }
        : undefined,
  });

  // Infinite scroll intersection observer
  React.useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '200px' },
    );

    const el = loadMoreRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten all items across pages
  const allItems: TimelineItem[] = React.useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((p) => p.items);
  }, [data]);

  // Group items by Month Year
  const groupedByMonth = React.useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    for (const item of allItems) {
      const key = getMonthKey(item.occurredAt);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    }
    return Array.from(map.entries());
  }, [allItems]);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Filter Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_CHIPS.map((chip) => {
          const Icon = chip.icon;
          const isSelected = activeFilter === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => setActiveFilter(chip.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border cursor-pointer transition-colors ${
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                  : 'border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{chip.label}</span>
            </button>
          );
        })}
      </div>

      {/* Timeline Stream */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
          <span>Loading care timeline...</span>
        </div>
      ) : allItems.length === 0 ? (
        <EmptyState
          title="No timeline events recorded"
          description="Appointments, prescriptions, medical documents, and family updates will appear here in chronological order."
          icon={Activity}
        />
      ) : (
        <div className="space-y-6">
          {groupedByMonth.map(([monthLabel, items]) => (
            <div key={monthLabel} className="space-y-2">
              {/* Sticky Month Group Header */}
              <div className="sticky top-14 z-10 py-1.5 bg-background/95 backdrop-blur-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded-md bg-muted/60">
                  {monthLabel}
                </span>
              </div>

              {/* Items in this month */}
              <div className="pt-2">
                {items.map((item) => (
                  <TimelineItemCard
                    key={`${item.kind}-${item.id}`}
                    circleId={circleId}
                    item={item}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Infinite Scroll Anchor & Loader */}
          <div ref={loadMoreRef} className="py-4 text-center">
            {isFetchingNextPage ? (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Loading earlier history...</span>
              </div>
            ) : hasNextPage ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 text-xs"
                onClick={() => fetchNextPage()}
              >
                Load more history
              </Button>
            ) : allItems.length > 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Reached the beginning of the care timeline.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
