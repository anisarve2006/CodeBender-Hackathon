import { Pill } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { requireCircleRole } from '@/lib/data/circle-context';
import { getActiveMedications, getPastMedications } from '@/lib/data/medications';
import { can } from '@/lib/utils/rbac';
import { MEDICATION_COPY } from '@/lib/schemas/medications';
import { MedicationCard, type MedicationCardData } from '@/components/features/meds/medication-card';
import { QuickAddMedicationButton } from '@/components/features/meds/quick-add-medication';

type MedicationRow = Awaited<ReturnType<typeof getActiveMedications>>[number];

/** Maps a DAL row to card data. Past medicines never show a countdown or refill actions. */
function toCardData(row: MedicationRow, includeRefill: boolean): MedicationCardData {
  const hasRefill =
    includeRefill &&
    row.refillId !== null &&
    row.quantityOnHand !== null &&
    row.dailyUsage !== null &&
    row.refillStatus !== null;

  return {
    id: row.id,
    name: row.name,
    strength: row.strength,
    form: row.form,
    instructionsAsWritten: row.instructionsAsWritten,
    prescribedBy: row.prescribedBy,
    refill: hasRefill
      ? {
          id: row.refillId as string,
          quantityOnHand: row.quantityOnHand as number,
          dailyUsage: row.dailyUsage as number,
          nextRefillDue: row.nextRefillDue,
          status: row.refillStatus as NonNullable<MedicationRow['refillStatus']>,
        }
      : null,
  };
}

export default async function MedsPage({
  params,
}: {
  params: Promise<{ circleId: string }>;
}) {
  const { circleId } = await params;
  const ctx = await requireCircleRole(circleId);
  const canManage = can(ctx.role, 'manage_records');

  const [active, past] = await Promise.all([
    getActiveMedications(circleId),
    getPastMedications(circleId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Medicines & Refills"
          subtitle="Active medicines, instructions as written, and refill countdowns"
        />
        {canManage && <QuickAddMedicationButton circleId={circleId} />}
      </div>

      <p className="text-sm text-muted-foreground">{MEDICATION_COPY.disclaimer}</p>

      {active.length === 0 ? (
        <EmptyState
          title="No active medicines"
          description="Add a medicine from its prescription to start the refill countdown."
          icon={Pill}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {active.map((row) => (
            <li key={row.id}>
              <MedicationCard
                circleId={circleId}
                medication={toCardData(row, true)}
                canManage={canManage}
              />
            </li>
          ))}
        </ul>
      )}

      <details className="rounded-lg border bg-card p-4">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">
          Past medicines ({past.length})
        </summary>
        {past.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No past medicines yet.</p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {past.map((row) => (
              <li key={row.id}>
                <MedicationCard
                  circleId={circleId}
                  medication={toCardData(row, false)}
                  canManage={false}
                />
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}
