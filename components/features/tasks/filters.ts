import { addDays, addMonths, addWeeks } from 'date-fns';

/**
 * components/features/tasks/filters.ts
 * Owner: Member A
 * Pure task filtering and due-date helpers. No server or React imports,
 * so these run in unit tests and in the browser.
 */

export type TaskFilter = 'mine' | 'everyone' | 'unassigned' | 'overdue' | 'done';

export const TASK_FILTERS: Array<{ value: TaskFilter; label: string }> = [
  { value: 'mine', label: 'Mine' },
  { value: 'everyone', label: 'Everyone' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'done', label: 'Done' },
];

export type TaskLike = {
  status: string;
  dueAt: Date | string | null;
  assignedTo: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN = new Set(['todo', 'in_progress']);

export function isOpenStatus(status: string): boolean {
  return OPEN.has(status);
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

/** An open task whose due time has passed. Tasks with no due date are never overdue. */
export function isOverdue(task: Pick<TaskLike, 'status' | 'dueAt'>, now: Date): boolean {
  const due = toDate(task.dueAt);
  return isOpenStatus(task.status) && due !== null && due.getTime() < now.getTime();
}

/** Whole days since the due time (0 when not late). Used for the "N days late" label. */
export function daysLate(dueAt: Date | string | null, now: Date): number {
  const due = toDate(dueAt);
  if (!due || due.getTime() >= now.getTime()) return 0;
  return Math.floor((now.getTime() - due.getTime()) / DAY_MS);
}

function byDueAscNullsLast<T extends { dueAt: Date | string | null }>(a: T, b: T): number {
  const aDue = toDate(a.dueAt);
  const bDue = toDate(b.dueAt);
  if (aDue && bDue) return aDue.getTime() - bDue.getTime();
  if (aDue) return -1;
  if (bDue) return 1;
  return 0;
}

/**
 * Applies a filter tab. Open-task filters return tasks sorted by due date
 * (earliest first, no-date last). The Done filter keeps the order it was given.
 */
export function filterTasks<T extends TaskLike>(
  tasks: T[],
  filter: TaskFilter,
  options: { userId: string; now: Date },
): T[] {
  if (filter === 'done') {
    return tasks.filter((task) => task.status === 'done');
  }

  const open = tasks.filter((task) => isOpenStatus(task.status));
  let selected: T[];
  switch (filter) {
    case 'mine':
      selected = open.filter((task) => task.assignedTo === options.userId);
      break;
    case 'unassigned':
      selected = open.filter((task) => task.assignedTo === null);
      break;
    case 'overdue':
      selected = open.filter((task) => isOverdue(task, options.now));
      break;
    case 'everyone':
    default:
      selected = open;
      break;
  }
  return [...selected].sort(byDueAscNullsLast);
}

/**
 * Next due time for a recurring task, one period after its current due time.
 * Returns null for non-recurring tasks or when there is no due time.
 */
export function nextRecurrenceDue(
  dueAt: Date | string | null,
  rule: string | null | undefined,
): Date | null {
  const due = toDate(dueAt);
  if (!due || !rule || rule === 'none') return null;

  switch (rule) {
    case 'daily':
      return addDays(due, 1);
    case 'weekly':
      return addWeeks(due, 1);
    case 'monthly':
      return addMonths(due, 1);
    default:
      return null;
  }
}
