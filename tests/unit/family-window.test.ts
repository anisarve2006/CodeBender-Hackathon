import { describe, it, expect } from 'vitest';
import { whoDidWhatWindow, istDayStartMs } from '@/lib/data/dashboard-window';

// 2026-06-10 12:00 UTC is 17:30 IST on 10 June, so the IST day starts at 2026-06-09T18:30Z.
const NOW = new Date('2026-06-10T12:00:00Z');

describe('istDayStartMs', () => {
  it('returns the UTC instant of IST midnight for the containing day', () => {
    expect(istDayStartMs(NOW.getTime())).toBe(new Date('2026-06-09T18:30:00Z').getTime());
  });

  it('treats 23:59 IST as still the same IST day', () => {
    const lateIst = new Date('2026-06-09T18:29:59Z');
    expect(istDayStartMs(lateIst.getTime())).toBe(new Date('2026-06-08T18:30:00Z').getTime());
  });

  it('starts a new IST day exactly at IST midnight', () => {
    const midnightIst = new Date('2026-06-09T18:30:00Z');
    expect(istDayStartMs(midnightIst.getTime())).toBe(midnightIst.getTime());
  });
});

describe('whoDidWhatWindow', () => {
  it('7-day window starts six days before the IST day start and ends at now', () => {
    const { from, to } = whoDidWhatWindow(7, NOW);
    expect(from.toISOString()).toBe('2026-06-03T18:30:00.000Z');
    expect(to.getTime()).toBe(NOW.getTime());
  });

  it('30-day window starts 29 days before the IST day start', () => {
    const { from, to } = whoDidWhatWindow(30, NOW);
    expect(from.toISOString()).toBe('2026-05-11T18:30:00.000Z');
    expect(to.getTime()).toBe(NOW.getTime());
  });

  it('uses the IST calendar day, so a UTC-early-morning now still counts the IST day', () => {
    // 2026-06-10 01:00 UTC is still 10 June IST (06:30), so the window is the same as NOW's.
    const early = new Date('2026-06-10T01:00:00Z');
    expect(whoDidWhatWindow(7, early).from.toISOString()).toBe('2026-06-03T18:30:00.000Z');
  });

  it('rolls over to the next IST day just after IST midnight', () => {
    const justAfterMidnight = new Date('2026-06-09T18:30:01Z'); // 00:00:01 IST on 10 June
    expect(whoDidWhatWindow(7, justAfterMidnight).from.toISOString()).toBe('2026-06-03T18:30:00.000Z');
  });
});
