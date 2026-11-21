import { TaskCard } from './task-card';
import { isOverdue } from './filters';
import type { TaskView } from './types';

/**
 * components/features/tasks/task-views.tsx
 * Owner: Member A
 * List view (all breakpoints) and board view (desktop only, grouped by due date).
 */

type TaskViewProps = {
  tasks: TaskView[];
  now: Date;
  highlightIds: Set<string>;
  onOpen: (taskId: string) => void;
  emptyMessage: string;
};

export function TaskList({ tasks, now, highlightIds, onOpen, emptyMessage }: TaskViewProps) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="space-y-3" aria-label="Tasks">
      {tasks.map((task) => (
        <li key={task.id}>
          <TaskCard
            task={task}
            now={now}
            highlighted={highlightIds.has(task.id)}
            onOpen={onOpen}
          />
        </li>
      ))}
    </ul>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

function bucketOf(task: TaskView, now: Date): 'overdue' | 'week' | 'later' | 'nodate' {
  if (isOverdue(task, now)) return 'overdue';
  if (!task.dueAt) return 'nodate';
  return new Date(task.dueAt).getTime() - now.getTime() <= 7 * DAY_MS ? 'week' : 'later';
}

const COLUMNS: Array<{ key: ReturnType<typeof bucketOf>; label: string }> = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'week', label: 'Next 7 days' },
  { key: 'later', label: 'Later' },
  { key: 'nodate', label: 'No due date' },
];

export function TaskBoard({ tasks, now, highlightIds, onOpen }: TaskViewProps) {
  return (
    <div className="grid grid-cols-4 gap-4" aria-label="Task board">
      {COLUMNS.map((column) => {
        const columnTasks = tasks.filter((task) => bucketOf(task, now) === column.key);
        return (
          <section key={column.key} className="min-w-0 space-y-3">
            <h2 className="flex items-center justify-between text-sm font-semibold">
              {column.label}
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {columnTasks.length}
              </span>
            </h2>
            {columnTasks.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                Nothing here
              </p>
            ) : (
              columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  now={now}
                  highlighted={highlightIds.has(task.id)}
                  onOpen={onOpen}
                />
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}
