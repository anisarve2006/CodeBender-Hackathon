'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { CheckSquare } from 'lucide-react';

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Care Tasks"
        subtitle="Manage, assign, claim, and mark daily tasks and reminders"
      />
      <EmptyState
        title="Task Management"
        description="Coming soon - Member A feature implementation"
        icon={CheckSquare}
      />
    </div>
  );
}
