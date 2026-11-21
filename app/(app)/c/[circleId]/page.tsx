'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LayoutDashboard } from 'lucide-react';

export default function StatusBoardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Status Board"
        subtitle="10-second overview: what is overdue, what is next, who owns it"
      />
      <EmptyState
        title="Circle Status Board"
        description="Coming soon - Member A feature implementation (traffic-light banner, needs attention, next up, who's on what)"
        icon={LayoutDashboard}
      />
    </div>
  );
}
