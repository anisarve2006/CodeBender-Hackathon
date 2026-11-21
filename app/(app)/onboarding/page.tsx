'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Sparkles } from 'lucide-react';

export default function OnboardingPage() {
  return (
    <div className="container max-w-2xl py-12 px-4 space-y-6">
      <PageHeader
        title="Setup Your Care Circle"
        subtitle="3-step onboarding wizard to initialize family care"
      />
      <EmptyState
        title="Onboarding Wizard"
        description="Coming soon - Member A feature implementation"
        icon={Sparkles}
      />
    </div>
  );
}
