import { describe, it, expect } from 'vitest';
import {
  addDaysIso,
  computeRefillStatus,
  countdownTone,
  daysLeft,
  nextRefillDueFrom,
  progressPercent,
  refillStatusAfterOrder,
  refillStatusAfterRefill,
  todayIsoDate,
} from '@/lib/utils/refill-math';

describe('daysLeft (countdown)', () => {
  it.each([
    [7, 2, 3],
    [10, 3, 3],
    [30, 1, 30],
    [0, 1, 0],
    [1, 2, 0],
    [14, 7, 2],
  ])('quantity %i at daily usage %i gives %i whole days', (quantity, usage, expected) => {
    expect(daysLeft(quantity, usage)).toBe(expected);
  });

  it('never returns a negative number', () => {
    expect(daysLeft(-5, 1)).toBe(0);
  });

  it('returns 0 for an invalid daily usage instead of dividing by zero', () => {
    expect(daysLeft(10, 0)).toBe(0);
    expect(daysLeft(10, -2)).toBe(0);
  });
});

describe('countdownTone (amber and red thresholds)', () => {
  it('is red (overdue) when no full day is left', () => {
    expect(countdownTone(0)).toBe('overdue');
  });

  it('is amber (warning) at 1 to 5 days', () => {
    expect(countdownTone(1)).toBe('warning');
    expect(countdownTone(5)).toBe('warning');
  });

  it('is neutral (ok) above 5 days', () => {
    expect(countdownTone(6)).toBe('ok');
  });
});

describe('computeRefillStatus (status transitions)', () => {
  it('is overdue when quantity covers less than one day', () => {
    expect(computeRefillStatus(0, 1)).toBe('overdue');
    expect(computeRefillStatus(1, 2)).toBe('overdue');
  });

  it('is due_soon at 5 days or fewer', () => {
    expect(computeRefillStatus(5, 1)).toBe('due_soon');
    expect(computeRefillStatus(4, 1)).toBe('due_soon');
  });

  it('is ok above 5 days', () => {
    expect(computeRefillStatus(6, 1)).toBe('ok');
    expect(computeRefillStatus(30, 1)).toBe('ok');
  });

  it('keeps ordered until a refill is recorded', () => {
    expect(computeRefillStatus(0, 1, 'ordered')).toBe('ordered');
    expect(computeRefillStatus(30, 1, 'ordered')).toBe('ordered');
  });

  it('recomputes from the quantity when the current status is refilled', () => {
    expect(computeRefillStatus(3, 1, 'refilled')).toBe('due_soon');
    expect(computeRefillStatus(20, 1, 'refilled')).toBe('ok');
  });

  it('moves to ordered when marked ordered, and to refilled when a refill is recorded', () => {
    expect(refillStatusAfterOrder()).toBe('ordered');
    expect(refillStatusAfterRefill()).toBe('refilled');
  });
});

describe('dates for the refill countdown', () => {
  it('adds whole days across month boundaries without timezone drift', () => {
    expect(addDaysIso('2030-03-01', 10)).toBe('2030-03-11');
    expect(addDaysIso('2030-02-27', 5)).toBe('2030-03-04');
    expect(addDaysIso('2028-02-28', 1)).toBe('2028-02-29'); // leap year
  });

  it('computes the next refill due as refill date plus days of supply', () => {
    expect(nextRefillDueFrom('2030-03-01', 10, 2)).toBe('2030-03-06');
    expect(nextRefillDueFrom('2030-03-01', 0, 2)).toBe('2030-03-01');
  });

  it('resolves "today" in the given timezone (Asia/Kolkata by default)', () => {
    // 20:00 UTC on 4 March is 01:30 on 5 March in Asia/Kolkata.
    const now = new Date('2030-03-04T20:00:00.000Z');
    expect(todayIsoDate('Asia/Kolkata', now)).toBe('2030-03-05');
    expect(todayIsoDate('UTC', now)).toBe('2030-03-04');
  });
});

describe('progressPercent (progress bar)', () => {
  it('scales days of supply onto a 0 to 100 range and clamps it', () => {
    expect(progressPercent(0)).toBe(0);
    expect(progressPercent(15)).toBe(50);
    expect(progressPercent(30)).toBe(100);
    expect(progressPercent(90)).toBe(100);
    expect(progressPercent(-3)).toBe(0);
  });
});
