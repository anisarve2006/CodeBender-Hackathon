'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Pill } from 'lucide-react';

export default function MedsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Medications & Refill Countdown"
        subtitle="Active prescription medicines and automated supply replenishment tracking"
      />
      <EmptyState
        title="Medications Tracker"
        description="Coming soon - Member B feature implementation"
        icon={Pill}
      />
    </div>
  );
}
