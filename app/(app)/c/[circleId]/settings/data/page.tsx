import { PageHeader } from '@/components/shared/PageHeader';
import { requireCircleRole } from '@/lib/data/circle-context';
import { DataSettingsView } from '@/components/features/settings-data/data-settings-view';

export default async function CircleDataSettingsPage({
  params,
}: {
  params: Promise<{ circleId: string }>;
}) {
  const { circleId } = await params;
  const ctx = await requireCircleRole(circleId);

  const isOwner = ctx.role === 'owner';

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Data Portability & Deletion"
        subtitle="Manage DPDP Act 2023 data exports, record portability, and circle erasure"
      />

      <p className="text-sm text-muted-foreground">
        Family Care Hub organises information only and does not provide medical advice. All personal data is handled according to DPDP Act privacy principles.
      </p>

      <DataSettingsView
        circleId={circleId}
        circleName={ctx.circleName}
        isOwner={isOwner}
      />
    </div>
  );
}
