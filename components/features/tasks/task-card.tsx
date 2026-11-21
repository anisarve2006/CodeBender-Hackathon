import {
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckSquare,
  Clock,
  FileText,
  ListTodo,
  Minus,
  Pill,
  Repeat,
  Wallet,
  Car,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDateTime, formatRelative } from '@/lib/utils/dates';
import { daysLate, isOverdue, nextRecurrenceDue } from './filters';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  RECURRENCE_LABELS,
  type TaskView,
} from './types';

/**
 * components/features/tasks/task-card.tsx
 * Owner: Member A
 * One task in the list or board. The whole card opens the detail sheet.
 * Priority and overdue state use icon and text as well as colour.
 */

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  medication: Pill,
  appointment: Calendar,
  errand: Car,
  payment: Wallet,
  paperwork: FileText,
  other: ListTodo,
};

const PRIORITY_ICONS: Record<string, LucideIcon> = {
  high: ArrowUp,
  normal: Minus,
  low: ArrowDown,
};

const LINKED_LABELS: Record<string, string> = {
  appointment: 'Linked: appointment',
  medication: 'Linked: medicines',
  refill: 'Linked: medicines',
};

export const TIME_ZONE = 'Asia/Kolkata';

export function initialsOf(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

type TaskCardProps = {
  task: TaskView;
  now: Date;
  highlighted?: boolean;
  onOpen: (taskId: string) => void;
};

export function TaskCard({ task, now, highlighted = false, onOpen }: TaskCardProps) {
  const done = task.status === 'done';
  const overdue = isOverdue(task, now);
  const late = daysLate(task.dueAt, now);
  const CategoryIcon = CATEGORY_ICONS[task.category] ?? ListTodo;
  const PriorityIcon = PRIORITY_ICONS[task.priority] ?? Minus;
  const initials = initialsOf(task.assigneeName);
  const nextDue = done ? null : nextRecurrenceDue(task.dueAt, task.recurrenceRule);
  const repeats = task.recurrenceRule && task.recurrenceRule !== 'none';

  return (
    <button
      type="button"
      onClick={() => onOpen(task.id)}
      className={cn(
        'w-full min-h-11 rounded-lg border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        overdue && 'border-red-300 dark:border-red-900',
        highlighted && 'ring-2 ring-primary motion-safe:animate-pulse',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={cn('font-medium leading-snug', done && 'text-muted-foreground line-through')}>
          {task.title}
        </p>
        {done && <CheckSquare className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Done" />}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CategoryIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {CATEGORY_LABELS[task.category] ?? 'Other'}
        </span>
        <span className="inline-flex items-center gap-1">
          <PriorityIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {PRIORITY_LABELS[task.priority] ?? 'Normal priority'}
        </span>
        {task.linkedEntityType && LINKED_LABELS[task.linkedEntityType] && (
          <Badge variant="outline" className="text-[11px]">
            {LINKED_LABELS[task.linkedEntityType]}
          </Badge>
        )}
        {repeats && (
          <span className="inline-flex items-center gap-1">
            <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
            {RECURRENCE_LABELS[task.recurrenceRule as string]}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs">
          {done && task.completedAt ? (
            <span className="text-muted-foreground">
              Completed {formatRelative(task.completedAt)}
              {task.completedByName ? ` by ${task.completedByName}` : ''}
            </span>
          ) : task.dueAt ? (
            <span
              className="inline-flex items-center gap-1 text-muted-foreground"
              title={formatDateTime(task.dueAt, TIME_ZONE)}
            >
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDateTime(task.dueAt, TIME_ZONE, 'd MMM, p')}
            </span>
          ) : (
            <span className="text-muted-foreground">No due date</span>
          )}
          {overdue && (
            <span className="ml-2 font-semibold text-red-700 dark:text-red-400">
              {late >= 1 ? `${late} ${late === 1 ? 'day' : 'days'} late` : 'Overdue'}
            </span>
          )}
          {nextDue && (
            <span className="block text-muted-foreground">
              Next: {formatDateTime(nextDue, TIME_ZONE, 'd MMM')}
            </span>
          )}
        </div>

        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          {initials ? (
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-800 dark:bg-slate-700 dark:text-slate-100"
            >
              {initials}
            </span>
          ) : null}
          {task.assigneeName ?? 'Unassigned'}
        </span>
      </div>
    </button>
  );
}
