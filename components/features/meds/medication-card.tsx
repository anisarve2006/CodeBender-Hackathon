import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MEDICATION_COPY } from '@/lib/schemas/medications';
import {
  countdownTone,
  daysLeft,
  progressPercent,
  type CountdownTone,
  type RefillStatus,
} from '@/lib/utils/refill-math';
import { RefillActions } from './refill-actions';

/**
 * Medicine card. Owner: Member B.
 * The instructions block is rendered exactly as stored, labelled "As written on prescription".
 */

export interface MedicationCardData {
  id: string;
  name: string;
  strength: string | null;
  form: string | null;
  instructionsAsWritten: string;
  prescribedBy: string | null;
  refill: {
    id: string;
    quantityOnHand: number;
    dailyUsage: number;
    nextRefillDue: string | null;
    status: RefillStatus;
  } | null;
}

interface MedicationCardProps {
  circleId: string;
  medication: MedicationCardData;
  canManage: boolean;
}

const STATUS_LABELS: Record<RefillStatus, string> = {
  ok: 'On track',
  due_soon: 'Refill soon',
  overdue: 'Overdue',
  ordered: 'Ordered',
  refilled: 'Refilled',
};

const TONE_TEXT: Record<CountdownTone, string> = {
  ok: 'text-emerald-700 dark:text-emerald-300',
  warning: 'text-amber-700 dark:text-amber-300',
  overdue: 'text-red-700 dark:text-red-300',
};

const TONE_BAR: Record<CountdownTone, string> = {
  ok: 'bg-emerald-500',
  warning: 'bg-amber-500',
  overdue: 'bg-red-500',
};

function countdownText(days: number): string {
  if (days <= 0) return 'Out of supply';
  return `${days} ${days === 1 ? 'day' : 'days'} of supply left`;
}

export function MedicationCard({ circleId, medication, canManage }: MedicationCardProps) {
  const refill = medication.refill;
  const days = refill ? daysLeft(refill.quantityOnHand, refill.dailyUsage) : 0;
  const tone = countdownTone(days);
  const pct = progressPercent(days);

  return (
    <article className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="text-base font-semibold break-words">{medication.name}</h3>
          <div className="flex flex-wrap gap-2">
            {medication.strength && <Badge variant="secondary">{medication.strength}</Badge>}
            {medication.form && <Badge variant="outline">{medication.form}</Badge>}
          </div>
        </div>
        {refill && (
          <Badge variant="outline" className="shrink-0">
            {STATUS_LABELS[refill.status]}
          </Badge>
        )}
      </header>

      <section className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {MEDICATION_COPY.asWrittenLabel}
        </p>
        <blockquote className="whitespace-pre-wrap break-words rounded-md border-l-4 border-primary/60 bg-muted/50 p-3 text-base">
          {medication.instructionsAsWritten}
        </blockquote>
      </section>

      {medication.prescribedBy && (
        <p className="text-sm text-muted-foreground">Prescribed by {medication.prescribedBy}</p>
      )}

      {refill && (
        <section className="space-y-2" aria-label="Refill countdown">
          <p className={cn('text-sm font-semibold', TONE_TEXT[tone])}>{countdownText(days)}</p>
          <div
            role="progressbar"
            aria-label="Days of supply left"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-valuetext={countdownText(days)}
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
          >
            <div className={cn('h-full transition-all', TONE_BAR[tone])} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            Quantity on hand: {refill.quantityOnHand} · Daily usage: {refill.dailyUsage}
            {refill.nextRefillDue && <> · Next refill due: {refill.nextRefillDue}</>}
          </p>
          {canManage && (
            <RefillActions
              circleId={circleId}
              refillId={refill.id}
              medicationName={medication.name}
              status={refill.status}
            />
          )}
        </section>
      )}

      <p className="text-xs text-muted-foreground">{MEDICATION_COPY.disclaimer}</p>
    </article>
  );
}
