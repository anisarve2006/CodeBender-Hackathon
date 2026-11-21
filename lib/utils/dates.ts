import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export function toUtc(date: Date | string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return new Date(d.toISOString());
}

export function formatDateTime(
  date: Date | string | null | undefined,
  timeZone: string = DEFAULT_TIMEZONE,
  pattern: string = 'PPp',
): string {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  const zoned = toZonedTime(d, timeZone);
  return format(zoned, pattern);
}

export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}
