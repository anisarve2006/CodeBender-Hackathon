import { describe, it, expect } from 'vitest';
import { nextRecurrenceDue } from '@/components/features/tasks/filters';

describe('nextRecurrenceDue', () => {
  const due = new Date('2026-01-31T10:00:00Z');

  it('adds one day for daily tasks', () => {
    expect(nextRecurrenceDue(due, 'daily')?.toISOString()).toBe('2026-02-01T10:00:00.000Z');
  });

  it('adds one week for weekly tasks', () => {
    expect(nextRecurrenceDue(due, 'weekly')?.toISOString()).toBe('2026-02-07T10:00:00.000Z');
  });

  it('adds one calendar month for monthly tasks, clamping to the month end', () => {
    expect(nextRecurrenceDue(due, 'monthly')?.toISOString()).toBe('2026-02-28T10:00:00.000Z');
  });

  it('accepts an ISO string for the due time', () => {
    expect(nextRecurrenceDue('2026-03-01T08:30:00Z', 'daily')?.toISOString()).toBe(
      '2026-03-02T08:30:00.000Z',
    );
  });

  it('returns null for non-recurring tasks', () => {
    expect(nextRecurrenceDue(due, 'none')).toBeNull();
    expect(nextRecurrenceDue(due, null)).toBeNull();
    expect(nextRecurrenceDue(due, undefined)).toBeNull();
  });

  it('returns null when the task has no due time', () => {
    expect(nextRecurrenceDue(null, 'weekly')).toBeNull();
  });
});
