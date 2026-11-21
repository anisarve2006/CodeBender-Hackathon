'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Bell, Mail, Smartphone, Clock, Moon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  updateNotificationPreferencesAction,
  savePushSubscriptionAction,
  removePushSubscriptionAction,
  type NotificationPreferences,
} from '@/app/(app)/c/[circleId]/settings/notifications/actions';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function subscribePushSupport() {
  return () => {};
}

function getPushSupportSnapshot() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

function getPushSupportServerSnapshot() {
  return false;
}

interface NotificationSettingsFormProps {
  circleId?: string;
  initialPrefs: NotificationPreferences;
  vapidPublicKey?: string;
}

export function NotificationSettingsForm({
  initialPrefs,
  vapidPublicKey,
}: NotificationSettingsFormProps) {
  const [prefs, setPrefs] = React.useState<NotificationPreferences>(initialPrefs);
  const [isPushSubscribed, setIsPushSubscribed] = React.useState(prefs.push);
  const [isSaving, setIsSaving] = React.useState(false);

  const isPushSupported = React.useSyncExternalStore(
    subscribePushSupport,
    getPushSupportSnapshot,
    getPushSupportServerSnapshot,
  );

  React.useEffect(() => {
    if (isPushSupported) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) {
            setIsPushSubscribed(true);
          }
        });
      });
    }
  }, [isPushSupported]);

  async function handleToggleEmail(checked: boolean) {
    const updated = { ...prefs, email: checked };
    setPrefs(updated);
    const res = await updateNotificationPreferencesAction(updated);
    if (res.ok) {
      toast.success(checked ? 'Email reminders enabled' : 'Email reminders disabled');
    } else {
      toast.error(res.error || 'Failed to update preferences');
      setPrefs(prefs);
    }
  }

  async function handleToggleDigest(checked: boolean) {
    const updated = { ...prefs, digest: checked };
    setPrefs(updated);
    const res = await updateNotificationPreferencesAction(updated);
    if (res.ok) {
      toast.success(checked ? 'Daily care digest enabled' : 'Daily care digest disabled');
    } else {
      toast.error(res.error || 'Failed to update preferences');
      setPrefs(prefs);
    }
  }

  async function handleTogglePush(checked: boolean) {
    if (!isPushSupported) {
      toast.error('Web Push is not supported in this browser.');
      return;
    }

    if (!vapidPublicKey) {
      toast.error('VAPID public key is not configured on the server.');
      return;
    }

    try {
      setIsSaving(true);
      if (checked) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          toast.error('Notification permission was denied.');
          return;
        }

        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
          });
        }

        const subJson = sub.toJSON();
        if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
          const res = await savePushSubscriptionAction({
            endpoint: subJson.endpoint,
            keys: {
              p256dh: subJson.keys.p256dh,
              auth: subJson.keys.auth,
            },
          });
          if (res.ok) {
            setIsPushSubscribed(true);
            setPrefs((p) => ({ ...p, push: true }));
            toast.success('Web Push notifications enabled for this device!');
          } else {
            toast.error(res.error || 'Failed to save push subscription.');
          }
        }
      } else {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await removePushSubscriptionAction(sub.endpoint);
          await sub.unsubscribe();
        }
        setIsPushSubscribed(false);
        setPrefs((p) => ({ ...p, push: false }));
        await updateNotificationPreferencesAction({ ...prefs, push: false });
        toast.success('Web Push notifications disabled.');
      }
    } catch (err: unknown) {
      console.error('Push toggle error:', err);
      const message = err instanceof Error ? err.message : 'Error configuring push notifications';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Channels Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Choose how you wish to receive appointment reminders, refill alerts, and task updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-channel" className="text-base flex items-center gap-2 font-medium">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email Notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Receive transactional email reminders for appointments and refills.
              </p>
            </div>
            <Switch
              id="email-channel"
              checked={prefs.email}
              onCheckedChange={handleToggleEmail}
            />
          </div>

          <div className="border-t pt-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-channel" className="text-base flex items-center gap-2 font-medium">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                Browser Web Push
              </Label>
              <p className="text-xs text-muted-foreground">
                Receive instant push notifications on this device even when the tab is closed.
              </p>
            </div>
            <Switch
              id="push-channel"
              disabled={isSaving || !isPushSupported}
              checked={isPushSubscribed}
              onCheckedChange={handleTogglePush}
            />
          </div>
        </CardContent>
      </Card>

      {/* Daily Digest & Quiet Hours Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Cadence & Quiet Hours
          </CardTitle>
          <CardDescription>
            Control daily summary schedules and avoid late-night notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="digest-toggle" className="text-base font-medium">
                Evening Daily Digest (20:00 IST)
              </Label>
              <p className="text-xs text-muted-foreground">
                A single consolidated evening email summarizing pending tasks and upcoming visits across circles.
              </p>
            </div>
            <Switch
              id="digest-toggle"
              checked={prefs.digest}
              onCheckedChange={handleToggleDigest}
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Moon className="h-4 w-4 text-muted-foreground" />
              Quiet Hours (22:00 – 07:00 IST)
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Non-critical task reminders are automatically delayed until morning during quiet hours.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
