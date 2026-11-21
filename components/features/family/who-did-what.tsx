'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { CheckCircle2 } from 'lucide-react';
import type { MemberAccountability } from '@/lib/data/dashboard';
import { WINDOW_DAYS, WINDOW_LABELS, type WindowDays } from '@/lib/data/dashboard-window';

/**
 * components/features/family/who-did-what.tsx
 * Owner: Member A
 * Per-member completed, open and overdue counts for the last 7 or 30 days.
 * Each member links to the Tasks page filtered to that person.
 * The tasks page does not read the assignee param yet (see the Member A report).
 */

interface WhoDidWhatProps {
  circleId: string;
  sevenDay: MemberAccountability[];
  thirtyDay: MemberAccountability[];
}

const BARS = [
  { key: 'completed', label: 'Completed', className: 'bg-emerald-600' },
  { key: 'open', label: 'Open', className: 'bg-sky-600' },
  { key: 'overdue', label: 'Overdue', className: 'bg-red-600' },
] as const;

export function WhoDidWhat({ circleId, sevenDay, thirtyDay }: WhoDidWhatProps) {
  const [days, setDays] = React.useState<WindowDays>(7);
  const rows = days === 7 ? sevenDay : thirtyDay;

  const max = Math.max(1, ...rows.flatMap((row) => [row.completed, row.open, row.overdue]));
  const total = rows.reduce((sum, row) => sum + row.completed + row.open + row.overdue, 0);

  return (
    <section aria-labelledby="who-did-what-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="who-did-what-heading" className="text-lg font-semibold">
          Who did what
        </h2>
        <div role="group" aria-label="Time window" className="flex gap-2">
          {WINDOW_DAYS.map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={days === value ? 'default' : 'outline'}
              className="min-h-11"
              aria-pressed={days === value}
              onClick={() => setDays(value)}
            >
              {WINDOW_LABELS[value]}
            </Button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <EmptyState
          title="No task activity yet"
          description="Completed, open and overdue tasks will show here once the family starts using Tasks."
          icon={CheckCircle2}
        />
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.userId} className="space-y-2 rounded-lg border bg-card p-4">
              <Link
                href={`/c/${circleId}/tasks?assignee=${row.userId}`}
                className="inline-flex min-h-11 items-center font-medium underline-offset-4 hover:underline"
              >
                {row.fullName}
              </Link>
              <dl className="space-y-1.5">
                {BARS.map((bar) => {
                  const value = row[bar.key];
                  const width = `${Math.round((value / max) * 100)}%`;
                  return (
                    <div key={bar.key} className="grid grid-cols-[6rem_1fr_2.5rem] items-center gap-2 text-sm">
                      <dt className="text-muted-foreground">{bar.label}</dt>
                      <dd className="h-2.5 rounded bg-muted">
                        <span
                          className={`block h-2.5 rounded ${bar.className}`}
                          style={{ width }}
                          aria-hidden
                        />
                      </dd>
                      <span className="text-right tabular-nums">{value}</span>
                    </div>
                  );
                })}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
