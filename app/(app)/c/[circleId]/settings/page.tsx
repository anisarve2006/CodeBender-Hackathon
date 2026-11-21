'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Settings } from 'lucide-react';

export default function CircleSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Circle Settings"
        subtitle="Manage care recipient profile, member permissions, and circle configuration"
      />
      <EmptyState
        title="Settings & Member Management"
        description="Coming soon - Member A feature implementation"
        icon={Settings}
      />
    </div>
  );
}
