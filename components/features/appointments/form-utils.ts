/**
 * Shared helpers for appointment forms.
 * Owner: Member B
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Formats a Date for <input type="datetime-local"> in the browser's local time. */
export function toLocalInputValue(date: Date | undefined | null): string {
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** Parses a datetime-local value into a Date (undefined when empty or invalid). */
export function fromLocalInputValue(value: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Empty optional text fields become undefined so the Zod schemas accept them. */
export function emptyToUndefined(value: string | undefined | null): string | undefined {
  return value && value.trim() !== '' ? value : undefined;
}
