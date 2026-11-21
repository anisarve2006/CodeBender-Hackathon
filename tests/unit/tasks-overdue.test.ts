import { describe, it, expect } from 'vitest';
import { daysLate, isOverdue } from '@/components/features/tasks/filters';

const NOW = new Date('2026-06-10T12:00:00Z');

describe('isOverdue', () => {
  it('is true for an open task due before now', () => {
    expect(isOverdue({ status: 'todo', dueAt: new Date('2026-06-10T11:59:00Z') }, NOW)).toBe(true);
  });

  it('is true for in-progress tasks too', () => {
    expect(isOverdue({ status: 'in_progress', dueAt: '2026-06-01T00:00:00Z' }, NOW)).toBe(true);
  });

  it('is false when the due time is in the future', () => {
    expect(isOverdue({ status: 'todo', dueAt: new Date('2026-06-10T12:00:01Z') }, NOW)).toBe(false);
  });

  it('is false for done or cancelled tasks, even past due', () => {
    expect(isOverdue({ status: 'done', dueAt: new Date('2026-01-01T00:00:00Z') }, NOW)).toBe(false);
    expect(isOverdue({ status: 'cancelled', dueAt: new Date('2026-01-01T00:00:00Z') }, NOW)).toBe(false);
  });

  it('is false when there is no due date', () => {
    expect(isOverdue({ status: 'todo', dueAt: null }, NOW)).toBe(false);
  });
});

describe('daysLate', () => {
  it('counts whole days since the due time', () => {
    expect(daysLate(new Date('2026-06-07T12:00:00Z'), NOW)).toBe(3);
  });

  it('rounds down, so less than 24 hours late is 0', () => {
    expect(daysLate(new Date('2026-06-09T13:00:00Z'), NOW)).toBe(0);
  });

  it('is 0 when not yet due or when there is no due date', () => {
    expect(daysLate(new Date('2026-06-11T00:00:00Z'), NOW)).toBe(0);
    expect(daysLate(null, NOW)).toBe(0);
  });
});
