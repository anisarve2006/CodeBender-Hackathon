'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Activity } from 'lucide-react';

export default function TimelinePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Care Timeline"
        subtitle="Chronological feed of appointments, prescriptions, reports, and updates"
      />
      <EmptyState
        title="Activity & Record Timeline"
        description="Coming soon - Member B feature implementation"
        icon={Activity}
      />
    </div>
  );
}
