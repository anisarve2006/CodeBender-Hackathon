'use client';

import * as React from 'react';
import { Mail, Bell, Moon, Sun, ShieldCheck, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  updateNotificationPrefsAction,
  savePushSubscriptionAction,
  deletePushSubscriptionAction,
} from '@/app/(app)/c/[circleId]/settings/notifications/actions';
import { toast } from 'sonner';
import type { UserNotificationPrefs } from '@/lib/data/notifications';

interface NotificationSettingsViewProps {
  circleId: string;
  initialPrefs: UserNotificationPrefs;
  vapidPublicKey?: string;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationSettingsView({
  circleId,
  initialPrefs,
  vapidPublicKey,
}: NotificationSettingsViewProps) {
  const [emailEnabled, setEmailEnabled] = React.useState(initialPrefs.email);
  const [pushEnabled, setPushEnabled] = React.useState(initialPrefs.push);
  const [digestEnabled, setDigestEnabled] = React.useState(initialPrefs.digest);
  const [quietHoursEnabled, setQuietHoursEnabled] = React.useState(
    initialPrefs.quietHours?.enabled ?? false,
  );
  const [quietStart, setQuietStart] = React.useState(initialPrefs.quietHours?.start ?? '22:00');
  const [quietEnd, setQuietEnd] = React.useState(initialPrefs.quietHours?.end ?? '07:00');
  const [saving, setSaving] = React.useState(false);
  const [pushSupported, setPushSupported] = React.useState(false);
  const [pushSubscribed, setPushSubscribed] = React.useState(false);

  // Check Web Push support in client browser
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((reg) => {
        setPushSupported(true);
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) {
            setPushSubscribed(true);
          }
        });
      }).catch(() => {
        // Service worker not ready or unsupported
      });
    }
  }, []);

  async function handleTogglePush() {
    if (!pushSupported) {
      toast.error('Web Push is not supported by your browser.');
      return;
    }

    if (pushSubscribed) {
      // Unsubscribe
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await deletePushSubscriptionAction(sub.endpoint);
        }
        setPushSubscribed(false);
        setPushEnabled(false);
        toast.success('Unsubscribed from Web Push notifications');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to unsubscribe');
      }
    } else {
      // Subscribe
      if (!vapidPublicKey) {
        toast.error('VAPID public key is not configured.');
        return;
      }

      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        const p256dh = sub.getKey('p256dh');
        const auth = sub.getKey('auth');

        if (!p256dh || !auth) {
          throw new Error('Could not retrieve encryption keys from browser');
        }

        const p256dhBase64 = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dh))));
        const authBase64 = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(auth))));

        await savePushSubscriptionAction({
          endpoint: sub.endpoint,
          p256dh: p256dhBase64,
          auth: authBase64,
        });

        setPushSubscribed(true);
        setPushEnabled(true);
        toast.success('Subscribed to Web Push notifications');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to enable push notifications');
      }
    }
  }

  async function handleSave() {
    setSaving(true);
    const updatedPrefs: UserNotificationPrefs = {
      email: emailEnabled,
      push: pushEnabled,
      digest: digestEnabled,
      quietHours: {
        enabled: quietHoursEnabled,
        start: quietStart,
        end: quietEnd,
      },
    };

    const res = await updateNotificationPrefsAction(circleId, updatedPrefs);
    setSaving(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    toast.success('Notification preferences updated');
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Privacy Notice Banner */}
      <div className="flex items-center gap-2.5 rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
        <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        <div>
          <span className="font-semibold text-foreground">Medical Privacy Guarantee:</span>{' '}
          Automated email and push alerts never disclose medicine names, medical diagnoses, or document titles.
        </div>
      </div>

      {/* Email Notifications Section */}
      <div className="rounded-xl border bg-card p-5 space-y-4 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Email Reminders</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receive transactional alerts for upcoming doctor appointments and overdue tasks.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={(e) => setEmailEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>

      {/* Web Push Section */}
      <div className="rounded-xl border bg-card p-5 space-y-4 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Browser Web Push</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Instant alerts delivered straight to this device when high-priority items require attention.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant={pushSubscribed ? 'outline' : 'default'}
            size="sm"
            className="min-h-11 text-xs"
            onClick={handleTogglePush}
            disabled={!pushSupported}
          >
            {pushSubscribed ? 'Subscribed' : 'Enable Web Push'}
          </Button>
        </div>
      </div>

      {/* Daily Digest Section */}
      <div className="rounded-xl border bg-card p-5 space-y-4 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600">
              <Sun className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Evening Daily Digest (20:00 IST)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                A single daily email summarizing pending tasks and upcoming appointments across your family circles.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={digestEnabled}
              onChange={(e) => setDigestEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>

      {/* Quiet Hours Section */}
      <div className="rounded-xl border bg-card p-5 space-y-4 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600">
              <Moon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Quiet Hours (Do Not Disturb)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Suppress non-urgent notifications during nighttime hours in your timezone.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={quietHoursEnabled}
              onChange={(e) => setQuietHoursEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {quietHoursEnabled && (
          <div className="pt-2 grid grid-cols-2 gap-4 border-t text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="quiet-start">Start Quiet Time</Label>
              <Input
                id="quiet-start"
                type="time"
                value={quietStart}
                onChange={(e) => setQuietStart(e.target.value)}
                className="min-h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quiet-end">End Quiet Time</Label>
              <Input
                id="quiet-end"
                type="time"
                value={quietEnd}
                onChange={(e) => setQuietEnd(e.target.value)}
                className="min-h-11"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          className="min-h-11 px-6"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? 'Saving...' : (
            <>
              <Check className="h-4 w-4 mr-1.5" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
