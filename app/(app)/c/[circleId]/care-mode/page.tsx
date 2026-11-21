'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { HeartPulse } from 'lucide-react';

export default function CareModePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Care Recipient Mode"
        subtitle="Simplified, high-contrast display with large font for care recipients"
      />
      <EmptyState
        title="Care Recipient View"
        description="Coming soon - Member B feature implementation"
        icon={HeartPulse}
      />
    </div>
  );
}
