'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { UserPlus } from 'lucide-react';

export default function InviteAcceptPage() {
  return (
    <div className="container max-w-xl py-12 px-4 space-y-6">
      <PageHeader
        title="Circle Invitation"
        subtitle="Join your family's care circle"
      />
      <EmptyState
        title="Accept Invitation"
        description="Coming soon - Member A feature implementation"
        icon={UserPlus}
      />
    </div>
  );
}
