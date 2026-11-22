import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { requireCircleRole } from '@/lib/data/circle-context';
import { listDocuments } from '@/lib/data/documents';
import { DocumentsView } from '@/components/features/documents/documents-view';

interface DocumentsPageProps {
  params: Promise<{ circleId: string }>;
}

export default async function DocumentsPage({ params }: DocumentsPageProps) {
  const { circleId } = await params;
  const ctx = await requireCircleRole(circleId, [
    'owner',
    'coordinator',
    'caregiver',
    'viewer',
    'care_recipient',
  ]);

  const docs = await listDocuments(ctx);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medical Documents Vault"
        subtitle="Prescriptions, lab test reports, and hospital summaries with access-controlled 60-second links"
      />
      <DocumentsView circleId={circleId} role={ctx.role} documents={docs} />
    </div>
  );
}
