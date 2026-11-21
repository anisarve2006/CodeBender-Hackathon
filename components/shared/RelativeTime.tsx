import * as React from 'react';
import { formatRelative, formatDateTime } from '@/lib/utils/dates';

interface RelativeTimeProps {
  date: Date | string | null | undefined;
  timeZone?: string;
  className?: string;
}

export function RelativeTime({ date, timeZone, className }: RelativeTimeProps) {
  if (!date) return null;

  const fullText = formatDateTime(date, timeZone);
  const relativeText = formatRelative(date);

  return (
    <time dateTime={new Date(date).toISOString()} title={fullText} className={className}>
      {relativeText}
    </time>
  );
}
