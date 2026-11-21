import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export type StatusType = 'ok' | 'attention' | 'overdue' | 'green' | 'amber' | 'red';

interface StatusPillProps {
  status: StatusType;
  label?: string;
  className?: string;
}

export function StatusPill({ status, label, className }: StatusPillProps) {
  const isOk = status === 'ok' || status === 'green';
  const isAttention = status === 'attention' || status === 'amber';
  const isOverdue = status === 'overdue' || status === 'red';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        isOk && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
        isAttention && 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
        isOverdue && 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
        className,
      )}
    >
      {isOk && <CheckCircle2 className="h-3.5 w-3.5" />}
      {isAttention && <AlertTriangle className="h-3.5 w-3.5" />}
      {isOverdue && <AlertCircle className="h-3.5 w-3.5" />}
      {label || (isOk ? 'On Schedule' : isAttention ? 'Needs Attention' : 'Overdue')}
    </span>
  );
}
