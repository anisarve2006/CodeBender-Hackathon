'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { FileText } from 'lucide-react';

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Medical Documents"
        subtitle="Securely stored prescriptions, lab reports, and hospital summaries"
      />
      <EmptyState
        title="Medical Records Vault"
        description="Coming soon - Member B feature implementation (with signed Vercel Blob URLs)"
        icon={FileText}
      />
    </div>
  );
}
