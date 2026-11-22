import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { requireCircleRole } from '@/lib/data/circle-context';
import { CircleDataSettingsView } from '@/components/features/settings-data/circle-data-settings-view';

interface CircleDataSettingsPageProps {
  params: Promise<{ circleId: string }>;
}

export default async function CircleDataSettingsPage({ params }: CircleDataSettingsPageProps) {
  const { circleId } = await params;
  const ctx = await requireCircleRole(circleId, ['owner']);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Portability & Erasure"
        subtitle="Download complete records archive under DPDP Act 2023 rights, or permanently delete circle"
      />
      <CircleDataSettingsView
        circleId={circleId}
        circleName={ctx.circleName}
      />
    </div>
  );
}
