/**
 * Pure refill arithmetic for the medicine tracker.
 * Owner: Member B
 *
 * Uses ONLY the stored quantity_on_hand and daily_usage values. It never computes doses,
 * frequencies or any medical advice. No I/O, so it is safe to import from client and server code.
 */

export const DUE_SOON_DAYS = 5;
export const PROGRESS_SCALE_DAYS = 30;

export type RefillStatus = 'ok' | 'due_soon' | 'overdue' | 'ordered' | 'refilled';
export type CountdownTone = 'ok' | 'warning' | 'overdue';

/** Whole days of supply left: floor(quantity_on_hand / daily_usage). Never negative. */
export function daysLeft(quantityOnHand: number, dailyUsage: number): number {
  if (dailyUsage <= 0 || !Number.isFinite(quantityOnHand) || !Number.isFinite(dailyUsage)) {
    return 0;
  }
  return Math.max(0, Math.floor(quantityOnHand / dailyUsage));
}

/** Colour band for the countdown: overdue when no full day is left, warning at 5 days or fewer. */
export function countdownTone(days: number): CountdownTone {
  if (days <= 0) return 'overdue';
  if (days <= DUE_SOON_DAYS) return 'warning';
  return 'ok';
}

/**
 * Status from the countdown. An `ordered` status sticks until the refill is recorded.
 * Any other current status (including `refilled`) is recomputed from the quantity.
 */
export function computeRefillStatus(
  quantityOnHand: number,
  dailyUsage: number,
  current?: RefillStatus,
): RefillStatus {
  if (current === 'ordered') return 'ordered';
  const days = daysLeft(quantityOnHand, dailyUsage);
  if (days <= 0) return 'overdue';
  if (days <= DUE_SOON_DAYS) return 'due_soon';
  return 'ok';
}

/** Transition applied when the family marks a refill as ordered. */
export function refillStatusAfterOrder(): RefillStatus {
  return 'ordered';
}

/** Transition applied when a refill is recorded. The countdown then uses the new quantity. */
export function refillStatusAfterRefill(): RefillStatus {
  return 'refilled';
}

/** Today's calendar date (YYYY-MM-DD) in the given IANA timezone. */
export function todayIsoDate(timeZone: string = 'Asia/Kolkata', now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Adds whole days to a YYYY-MM-DD date using UTC calendar arithmetic (no timezone drift). */
export function addDaysIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

/** Next refill due date: the refill date plus the whole days of supply it provides. */
export function nextRefillDueFrom(
  refilledOnIso: string,
  quantityOnHand: number,
  dailyUsage: number,
): string {
  return addDaysIso(refilledOnIso, daysLeft(quantityOnHand, dailyUsage));
}

/** Progress bar width (0-100) on a fixed scale of PROGRESS_SCALE_DAYS days. */
export function progressPercent(days: number): number {
  const pct = (Math.max(0, days) / PROGRESS_SCALE_DAYS) * 100;
  return Math.round(Math.min(100, pct));
}
