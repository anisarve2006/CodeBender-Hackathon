import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { requireUser } from '@/lib/auth/session';
import { requireCircleRole } from '@/lib/data/circle-context';
import { getUserNotificationPrefs } from '@/lib/data/notifications';
import { NotificationSettingsView } from '@/components/features/notifications/notification-settings-view';
import { clientEnv } from '@/lib/env';

interface NotificationSettingsPageProps {
  params: Promise<{ circleId: string }>;
}

export default async function NotificationSettingsPage({ params }: NotificationSettingsPageProps) {
  const { circleId } = await params;
  const user = await requireUser();
  await requireCircleRole(circleId, [
    'owner',
    'coordinator',
    'caregiver',
    'viewer',
    'care_recipient',
  ]);

  const prefs = await getUserNotificationPrefs(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Preferences"
        subtitle="Configure email notifications, Web Push subscriptions, quiet hours, and daily evening digests"
      />
      <NotificationSettingsView
        circleId={circleId}
        initialPrefs={prefs}
        vapidPublicKey={clientEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
      />
    </div>
  );
}
