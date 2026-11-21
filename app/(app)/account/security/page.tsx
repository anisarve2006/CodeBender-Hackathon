'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Shield } from 'lucide-react';

export default function AccountSecurityPage() {
  return (
    <div className="container max-w-3xl py-8 px-4 space-y-6">
      <PageHeader
        title="Security & 2FA"
        subtitle="Manage active sessions, password, and two-factor authentication"
      />
      <EmptyState
        title="Security Dashboard"
        description="Coming soon - Member A feature implementation"
        icon={Shield}
      />
    </div>
  );
}
