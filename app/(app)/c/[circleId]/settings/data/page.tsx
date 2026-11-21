'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Database } from 'lucide-react';

export default function CircleDataSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Data & Export"
        subtitle="DPDP Act data download (JSON + files ZIP) and circle deletion"
      />
      <EmptyState
        title="Data Portability & Deletion"
        description="Coming soon - Member B feature implementation"
        icon={Database}
      />
    </div>
  );
}
