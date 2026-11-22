import { PageHeader } from '@/components/shared/PageHeader';
import { MedsView } from '@/components/features/meds/meds-view';
import { requireCircleRole } from '@/lib/data/circle-context';
import { listMedications } from '@/lib/data/medications';
import { listCircleMembers } from '@/lib/data/members';
import { Info } from 'lucide-react';

/**
 * Medications and Refill Tracker Page
 * Owner: Member B
 * Renders active prescriptions with verbatim instructions and automatic refill countdown.
 */
export default async function MedsPage({
  params,
}: {
  params: Promise<{ circleId: string }>;
}) {
  const { circleId } = await params;
  const ctx = await requireCircleRole(circleId);

  const [medsData, rawMembers] = await Promise.all([
    listMedications(ctx),
    listCircleMembers(circleId, ctx.userId),
  ]);

  const members = rawMembers.map((m) => ({
    userId: m.userId,
    fullName: m.fullName,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medications & Refill Countdown"
        subtitle="Active prescription medicines and automated supply replenishment tracking"
      />

      {/* Persistent medical guardrail disclaimer */}
      <div className="rounded-xl border border-sky-200/70 bg-sky-50/60 p-4 text-xs text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200 flex items-start gap-2.5">
        <Info className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400 mt-0.5" />
        <p>
          <strong>Medical Notice:</strong> Instructions are displayed verbatim as written on
          prescriptions. Family Care Hub organises information only and does not provide medical
          advice, dosage calculations, or clinical recommendations. Always consult a licensed doctor.
        </p>
      </div>

      <MedsView
        circleId={circleId}
        role={ctx.role}
        active={medsData.active}
        past={medsData.past}
        members={members}
      />
    </div>
  );
}
