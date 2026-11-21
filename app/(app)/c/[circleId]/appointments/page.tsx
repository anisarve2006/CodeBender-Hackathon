'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Calendar } from 'lucide-react';

export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor Appointments"
        subtitle="Upcoming doctor visits, clinic locations, and appointment history"
      />
      <EmptyState
        title="Appointment Calendar"
        description="Coming soon - Member B feature implementation"
        icon={Calendar}
      />
    </div>
  );
}
