'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle2, Clock, PackageCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MedicationItemView } from '@/lib/data/medications';

interface RefillCountdownProps {
  refill: NonNullable<MedicationItemView['refill']>;
}

export function RefillCountdownBar({ refill }: RefillCountdownProps) {
  const { quantityOnHand, dailyUsage, nextRefillDue, status } = refill;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let daysRemaining = Math.floor(quantityOnHand / (dailyUsage || 1));
  if (nextRefillDue) {
    const due = new Date(nextRefillDue);
    due.setHours(0, 0, 0, 0);
    daysRemaining = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  const isOrdered = status === 'ordered';
  const isOverdue = status === 'overdue' || daysRemaining < 0;
  const isDueSoon = !isOverdue && (status === 'due_soon' || daysRemaining <= 5);

  let badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
  let progressColor = 'bg-emerald-600';
  let labelText = `${daysRemaining} days left`;
  let Icon = CheckCircle2;

  if (isOrdered) {
    badgeColor = 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
    progressColor = 'bg-purple-600';
    labelText = 'Refill Ordered';
    Icon = PackageCheck;
  } else if (isOverdue) {
    badgeColor = 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800';
    progressColor = 'bg-red-600';
    labelText = daysRemaining < 0 ? `Overdue by ${Math.abs(daysRemaining)} days` : 'Refill Overdue';
    Icon = AlertCircle;
  } else if (isDueSoon) {
    badgeColor = 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
    progressColor = 'bg-amber-600';
    labelText = `${daysRemaining} days left (Due soon)`;
    Icon = Clock;
  }

  // Supply percentage calculation (relative to a 30-day supply benchmark)
  const percent = Math.min(100, Math.max(5, Math.round((Math.max(0, daysRemaining) / 30) * 100)));

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium flex items-center gap-1.5">
          <span>Supply:</span>
          <strong className="text-foreground">{quantityOnHand} units</strong>
          <span className="text-[11px] text-muted-foreground">({dailyUsage}/day)</span>
        </span>

        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium border text-xs',
            badgeColor,
          )}
        >
          <Icon className="h-3 w-3" />
          <span>{labelText}</span>
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full transition-all duration-300', progressColor)}
          style={{ width: `${percent}%` }}
        />
      </div>

      {refill.assigneeName && (
        <p className="text-[11px] text-muted-foreground">
          Refill coordinator: <strong className="text-foreground font-medium">{refill.assigneeName}</strong>
        </p>
      )}
    </div>
  );
}
