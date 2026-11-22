'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, List, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useLiveCircle } from '@/lib/live/use-live-circle';
import { can } from '@/lib/utils/rbac';
import type { CircleRole } from '@/lib/types/app';
import { loadDoneTasksAction } from '@/app/(app)/c/[circleId]/tasks/actions';
import { QuickAddTaskDialog } from './quick-add-task';
import { FilterTabs } from './filter-tabs';
import { TaskBoard, TaskList } from './task-views';
import { TaskDetailSheet } from './task-detail-sheet';
import { filterTasks, type TaskFilter } from './filters';
import type { DonePage, MemberOption, TaskView } from './types';

/**
 * components/features/tasks/tasks-view.tsx
 * Owner: Member A
 * Client root for the Tasks page. Filters, list/board toggle, Done pagination,
 * live refresh through useLiveCircle, and a brief highlight on changed tasks.
 * The highlight uses a ring plus motion-safe pulse, so reduced motion gets no animation.
 */

type TasksViewProps = {
  circleId: string;
  role: CircleRole;
  userId: string;
  openTasks: TaskView[];
  donePage: DonePage;
  members: MemberOption[];
};

const HIGHLIGHT_MS = 2500;

const EMPTY_MESSAGES: Record<TaskFilter, string> = {
  mine: 'Nothing assigned to you right now.',
  everyone: 'No open tasks. Add one when something needs doing.',
  unassigned: 'Every open task has an owner.',
  overdue: 'Nothing is overdue. Well done.',
  done: 'No completed tasks yet.',
};

function signatureOf(task: TaskView): string {
  const due = task.dueAt ? new Date(task.dueAt).toISOString() : '';
  return `${task.status}|${task.assignedTo ?? ''}|${task.title}|${due}`;
}

export function TasksView({
  circleId,
  role,
  userId,
  openTasks,
  donePage,
  members,
}: TasksViewProps) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<TaskFilter>('mine');
  const [view, setView] = React.useState<'list' | 'board'>('list');
  const [now, setNow] = React.useState<Date>(() => new Date());
  const [done, setDone] = React.useState<DonePage>(donePage);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [highlightIds, setHighlightIds] = React.useState<Set<string>>(() => new Set());
  const previousSignatures = React.useRef<Map<string, string> | null>(null);

  // Keep overdue labels current without a full reload.
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Poll the circle version and refresh server data when another member changes something.
  const handleLiveChange = React.useCallback(() => {
    router.refresh();
  }, [router]);
  useLiveCircle(circleId, handleLiveChange);

  // New server data replaces the Done pages loaded so far.
  // Adjusted during render (React's documented pattern) instead of in an effect.
  const [trackedDonePage, setTrackedDonePage] = React.useState<DonePage>(donePage);
  if (donePage !== trackedDonePage) {
    setTrackedDonePage(donePage);
    setDone(donePage);
  }

  // Briefly highlight tasks that changed since the last server snapshot.
  React.useEffect(() => {
    const signatures = new Map(openTasks.map((task) => [task.id, signatureOf(task)]));
    const previous = previousSignatures.current;
    previousSignatures.current = signatures;

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (previous) {
      const changed = [...signatures]
        .filter(([id, signature]) => previous.get(id) !== signature)
        .map(([id]) => id);
      if (changed.length > 0) {
        setHighlightIds(new Set(changed));
        timer = setTimeout(() => setHighlightIds(new Set()), HIGHLIGHT_MS);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [openTasks]);

  const counts = React.useMemo(
    () => ({
      mine: filterTasks(openTasks, 'mine', { userId, now }).length,
      everyone: filterTasks(openTasks, 'everyone', { userId, now }).length,
      unassigned: filterTasks(openTasks, 'unassigned', { userId, now }).length,
      overdue: filterTasks(openTasks, 'overdue', { userId, now }).length,
      done: null,
    }),
    [openTasks, userId, now],
  );

  const visibleTasks =
    filter === 'done' ? done.items : filterTasks(openTasks, filter, { userId, now });
  const showBoard = view === 'board' && filter !== 'done';

  const selectedTask =
    selectedId === null
      ? null
      : (openTasks.find((task) => task.id === selectedId) ??
        done.items.find((task) => task.id === selectedId) ??
        null);

  async function loadMoreDone() {
    if (!done.nextCursor || loadingMore) return;
    setLoadingMore(true);
    const result = await loadDoneTasksAction({ circleId, cursor: done.nextCursor });
    setLoadingMore(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setDone((previous) => ({
      items: [...previous.items, ...result.data.items],
      nextCursor: result.data.nextCursor,
    }));
  }

  const overdueCount = counts.overdue;
  const openCount = counts.everyone;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {openCount} open · {overdueCount} overdue
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden gap-1 md:flex" role="group" aria-label="Choose view">
            <Button
              type="button"
              variant={view === 'list' ? 'default' : 'outline'}
              className="min-h-11"
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
            >
              <List className="h-4 w-4" aria-hidden="true" />
              List
            </Button>
            <Button
              type="button"
              variant={view === 'board' ? 'default' : 'outline'}
              className="min-h-11"
              aria-pressed={view === 'board'}
              onClick={() => setView('board')}
              disabled={filter === 'done'}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              Board
            </Button>
          </div>
          {can(role, 'create_tasks') && (
            <Button type="button" className="min-h-11" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New task
            </Button>
          )}
        </div>
      </div>

      <FilterTabs
        value={filter}
        counts={counts}
        onChange={(value) => setFilter(value)}
      />

      <div className={showBoard ? 'md:hidden' : undefined}>
        <TaskList
          tasks={visibleTasks}
          now={now}
          highlightIds={highlightIds}
          onOpen={setSelectedId}
          emptyMessage={EMPTY_MESSAGES[filter]}
        />
      </div>

      {showBoard && (
        <div className="hidden md:block">
          <TaskBoard
            tasks={visibleTasks}
            now={now}
            highlightIds={highlightIds}
            onOpen={setSelectedId}
            emptyMessage={EMPTY_MESSAGES[filter]}
          />
        </div>
      )}

      {filter === 'done' && done.nextCursor && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={loadMoreDone}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}

      <TaskDetailSheet
        circleId={circleId}
        role={role}
        userId={userId}
        task={selectedTask}
        members={members}
        open={selectedTask !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        onChanged={() => router.refresh()}
      />

      <QuickAddTaskDialog open={createOpen} onOpenChange={setCreateOpen} circleId={circleId} />
    </div>
  );
}
