'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Bell } from 'lucide-react';

export default function NotificationSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Channels"
        subtitle="Manage email reminders, daily digests, and Web Push subscriptions"
      />
      <EmptyState
        title="Notification Preferences"
        description="Coming soon - Member B feature implementation"
        icon={Bell}
      />
    </div>
  );
}
