'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Users } from 'lucide-react';

export default function FamilyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Family Members & Updates"
        subtitle="Circle members, roles, contact information, and family update feed"
      />
      <EmptyState
        title="Family Hub"
        description="Coming soon - Member A feature implementation"
        icon={Users}
      />
    </div>
  );
}
