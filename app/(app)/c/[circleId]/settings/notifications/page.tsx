import { PageHeader } from '@/components/shared/PageHeader';
import { requireVerifiedUser } from '@/lib/auth/session';
import { requireCircleRole } from '@/lib/data/circle-context';
import { getUserNotificationPreferences } from '@/lib/jobs/user-prefs';
import { NotificationSettingsForm } from '@/components/features/notifications/notification-settings-form';

export default async function NotificationSettingsPage({
  params,
}: {
  params: Promise<{ circleId: string }>;
}) {
  const { circleId } = await params;
  await requireCircleRole(circleId);
  const user = await requireVerifiedUser();

  const initialPrefs = await getUserNotificationPreferences(user.id);
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Notification Settings"
        subtitle="Manage transactional email alerts, daily digests, and browser push notifications"
      />

      <p className="text-sm text-muted-foreground">
        Family Care Hub organises information only and does not provide medical advice. Notifications never contain medicine names, diagnoses, or document titles.
      </p>

      <NotificationSettingsForm
        circleId={circleId}
        initialPrefs={initialPrefs}
        vapidPublicKey={vapidPublicKey}
      />
    </div>
  );
}
