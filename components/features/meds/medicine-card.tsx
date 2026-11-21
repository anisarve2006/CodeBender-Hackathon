'use client';

import * as React from 'react';
import { Pencil, ShoppingCart, Check, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RefillCountdownBar } from './refill-countdown-bar';
import { can } from '@/lib/utils/rbac';
import type { CircleRole } from '@/lib/types/app';
import type { MedicationItemView } from '@/lib/data/medications';

interface MedicineCardProps {
  medication: MedicationItemView;
  role: CircleRole;
  onEdit?: (medication: MedicationItemView) => void;
  onRefill?: (medication: MedicationItemView) => void;
  onMarkOrdered?: (refillId: string) => void;
  ordering?: boolean;
}

export function MedicineCard({
  medication,
  role,
  onEdit,
  onRefill,
  onMarkOrdered,
  ordering = false,
}: MedicineCardProps) {
  const canManage = can(role, 'manage_records');

  return (
    <div className="rounded-xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight text-foreground truncate">
              {medication.name}
            </h3>
            {medication.strength && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-foreground">
                {medication.strength}
              </span>
            )}
            {medication.form && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted/60 text-muted-foreground border">
                {medication.form}
              </span>
            )}
          </div>

          {medication.prescribedBy && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>Prescribed by {medication.prescribedBy}</span>
            </p>
          )}
        </div>

        {canManage && onEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 shrink-0"
            onClick={() => onEdit(medication)}
          >
            <Pencil className="h-4 w-4 mr-1.5" />
            <span className="text-xs">Edit</span>
          </Button>
        )}
      </div>

      {/* Verbatim instructions guardrail block */}
      <blockquote className="rounded-lg border-l-4 border-primary/70 bg-primary/5 p-3 text-xs text-foreground/90 space-y-1">
        <p className="font-semibold text-primary text-[11px] uppercase tracking-wider">
          As written on prescription:
        </p>
        <p className="italic leading-relaxed whitespace-pre-line">
          &ldquo;{medication.instructionsAsWritten}&rdquo;
        </p>
      </blockquote>

      {medication.refill && (
        <RefillCountdownBar refill={medication.refill} />
      )}

      {canManage && medication.refill && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
          {medication.refill.status !== 'ordered' && onMarkOrdered && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 text-xs"
              disabled={ordering}
              onClick={() => onMarkOrdered(medication.refill!.id)}
            >
              <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
              Mark ordered
            </Button>
          )}

          {onRefill && (
            <Button
              type="button"
              variant="default"
              size="sm"
              className="min-h-11 text-xs"
              onClick={() => onRefill(medication)}
            >
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Mark refilled
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
