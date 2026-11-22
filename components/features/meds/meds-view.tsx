'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Pill, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { useLiveCircle } from '@/lib/live/use-live-circle';
import { can } from '@/lib/utils/rbac';
import type { CircleRole } from '@/lib/types/app';
import type { MedicationItemView } from '@/lib/data/medications';
import { markRefillOrderedAction } from '@/app/(app)/c/[circleId]/meds/actions';
import { MedicineCard } from './medicine-card';
import { QuickAddMedDialog } from './quick-add-med';
import { EditMedDialog } from './edit-med-dialog';
import { RefillDialog } from './refill-dialog';

interface MedsViewProps {
  circleId: string;
  role: CircleRole;
  active: MedicationItemView[];
  past: MedicationItemView[];
  members: { userId: string; fullName: string }[];
}

export function MedsView({
  circleId,
  role,
  active,
  past,
  members,
}: MedsViewProps) {
  const router = useRouter();
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);
  const [editingMed, setEditingMed] = React.useState<MedicationItemView | null>(null);
  const [refillMed, setRefillMed] = React.useState<MedicationItemView | null>(null);
  const [showPast, setShowPast] = React.useState(false);
  const [orderingId, setOrderingId] = React.useState<string | null>(null);

  useLiveCircle(circleId, () => {
    router.refresh();
  });

  const canManage = can(role, 'manage_records');

  async function handleMarkOrdered(refillId: string) {
    setOrderingId(refillId);
    const result = await markRefillOrderedAction({ circleId, refillId });
    setOrderingId(null);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success('Refill marked as ordered');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {active.length} active prescription{active.length === 1 ? '' : 's'} tracked
          </p>
        </div>

        {canManage && (
          <Button
            type="button"
            className="min-h-11 shrink-0"
            onClick={() => setQuickAddOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Medication
          </Button>
        )}
      </div>

      {active.length === 0 ? (
        <EmptyState
          title="No active medications"
          description="Track prescription medicines, doctor instructions, and automated refill countdowns."
          icon={Pill}
          actionLabel={canManage ? 'Add Medication' : undefined}
          onAction={canManage ? () => setQuickAddOpen(true) : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {active.map((med) => (
            <MedicineCard
              key={med.id}
              medication={med}
              role={role}
              onEdit={canManage ? setEditingMed : undefined}
              onRefill={canManage ? setRefillMed : undefined}
              onMarkOrdered={canManage ? handleMarkOrdered : undefined}
              ordering={orderingId === med.refill?.id}
            />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="rounded-xl border bg-card/60 p-4 space-y-4">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left font-medium text-sm text-muted-foreground hover:text-foreground cursor-pointer min-h-11"
            onClick={() => setShowPast((prev) => !prev)}
            aria-expanded={showPast}
          >
            <span className="flex items-center gap-2">
              {showPast ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span>Past & Discontinued Medicines ({past.length})</span>
            </span>
            <span className="text-xs">{showPast ? 'Hide' : 'Show'}</span>
          </button>

          {showPast && (
            <div className="grid gap-4 md:grid-cols-2 pt-2 border-t">
              {past.map((med) => (
                <MedicineCard
                  key={med.id}
                  medication={med}
                  role={role}
                  onEdit={canManage ? setEditingMed : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <QuickAddMedDialog
        circleId={circleId}
        members={members}
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
      />

      <EditMedDialog
        circleId={circleId}
        medication={editingMed}
        open={editingMed !== null}
        onOpenChange={(open) => !open && setEditingMed(null)}
      />

      <RefillDialog
        circleId={circleId}
        medication={refillMed}
        open={refillMed !== null}
        onOpenChange={(open) => !open && setRefillMed(null)}
      />
    </div>
  );
}
