'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { User } from 'lucide-react';

export default function AccountPage() {
  return (
    <div className="container max-w-3xl py-8 px-4 space-y-6">
      <PageHeader
        title="Account Profile"
        subtitle="Manage your personal details, name, and notification preferences"
      />
      <EmptyState
        title="Profile Settings"
        description="Coming soon - Member A feature implementation"
        icon={User}
      />
    </div>
  );
}
