/**
 * lib/data/dashboard-window.ts
 * Owner: Member A
 * Pure date-window helpers for who_did_what(). Windows start at the beginning of
 * an Asia/Kolkata day and end now. No database imports, so it is unit tested directly.
 */

const IST_OFFSET_MS = 330 * 60 * 1000; // Asia/Kolkata is UTC+05:30 with no DST.
const DAY_MS = 24 * 60 * 60 * 1000;

export const WINDOW_DAYS = [7, 30] as const;
export type WindowDays = (typeof WINDOW_DAYS)[number];

export const WINDOW_LABELS: Record<WindowDays, string> = {
  7: 'Last 7 days',
  30: 'Last 30 days',
};

/** UTC instant of midnight (00:00) in Asia/Kolkata on the IST calendar day containing `ms`. */
export function istDayStartMs(ms: number): number {
  const shifted = new Date(ms + IST_OFFSET_MS);
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - IST_OFFSET_MS;
}

/**
 * The window for "last N days": from the start of the IST day (N-1 days before
 * today) up to `now`, so today counts as one of the N days.
 */
export function whoDidWhatWindow(days: WindowDays, now: Date = new Date()): { from: Date; to: Date } {
  const todayStart = istDayStartMs(now.getTime());
  return {
    from: new Date(todayStart - (days - 1) * DAY_MS),
    to: now,
  };
}
