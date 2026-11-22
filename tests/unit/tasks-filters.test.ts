import { describe, it, expect } from 'vitest';
import { filterTasks, type TaskLike } from '@/components/features/tasks/filters';

const NOW = new Date('2026-06-10T12:00:00Z');
const ME = 'user-me';
const OTHER = 'user-other';

type Row = TaskLike & { id: string };

const tasks: Row[] = [
  { id: 'a', status: 'todo', dueAt: new Date('2026-06-12T00:00:00Z'), assignedTo: ME },
  { id: 'b', status: 'in_progress', dueAt: new Date('2026-06-08T00:00:00Z'), assignedTo: OTHER },
  { id: 'c', status: 'todo', dueAt: null, assignedTo: null },
  { id: 'd', status: 'done', dueAt: new Date('2026-06-01T00:00:00Z'), assignedTo: ME },
  { id: 'e', status: 'todo', dueAt: new Date('2026-06-09T00:00:00Z'), assignedTo: null },
  { id: 'f', status: 'cancelled', dueAt: null, assignedTo: ME },
];

const ids = (rows: Row[]) => rows.map((row) => row.id);

describe('filterTasks', () => {
  it('Mine shows open tasks assigned to the caller', () => {
    expect(ids(filterTasks(tasks, 'mine', { userId: ME, now: NOW }))).toEqual(['a']);
  });

  it('Everyone shows all open tasks, earliest due first with no-date tasks last', () => {
    expect(ids(filterTasks(tasks, 'everyone', { userId: ME, now: NOW }))).toEqual(['b', 'e', 'a', 'c']);
  });

  it('Unassigned shows open tasks with no assignee', () => {
    expect(ids(filterTasks(tasks, 'unassigned', { userId: ME, now: NOW }))).toEqual(['e', 'c']);
  });

  it('Overdue shows open tasks whose due time has passed', () => {
    expect(ids(filterTasks(tasks, 'overdue', { userId: ME, now: NOW }))).toEqual(['b', 'e']);
  });

  it('Done shows completed tasks only, keeping the given order', () => {
    expect(ids(filterTasks(tasks, 'done', { userId: ME, now: NOW }))).toEqual(['d']);
  });

  it('never returns cancelled tasks in an open filter', () => {
    const all = filterTasks(tasks, 'everyone', { userId: ME, now: NOW });
    expect(ids(all)).not.toContain('f');
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterTasks([], 'mine', { userId: ME, now: NOW })).toEqual([]);
  });
});
