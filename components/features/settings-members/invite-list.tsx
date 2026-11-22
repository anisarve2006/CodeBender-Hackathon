'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { RelativeTime } from '@/components/shared/RelativeTime';
import { Mail } from 'lucide-react';
import { resendInviteAction, revokeInviteAction } from '@/app/(app)/c/[circleId]/settings/actions';
import type { PendingInvitation } from '@/lib/data/invitations';
import { ASSIGNABLE_ROLE_LABELS } from '@/lib/schemas/members';

/**
 * components/features/settings-members/invite-list.tsx
 * Owner: Member A
 * Open invitations with resend (new link, old link revoked) and revoke.
 */

export function InviteList({ circleId, invites }: { circleId: string; invites: PendingInvitation[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [rowErrors, setRowErrors] = React.useState<Record<string, string>>({});

  async function run(
    invite: PendingInvitation,
    action: () => Promise<{ ok: true; data: unknown } | { ok: false; error: string }>,
    successMessage: string,
  ) {
    setBusyId(invite.id);
    const result = await action();
    setBusyId(null);

    if (!result.ok) {
      setRowErrors((prev) => ({ ...prev, [invite.id]: result.error }));
      return;
    }
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[invite.id];
      return next;
    });
    toast.success(successMessage);
    router.refresh();
  }

  if (invites.length === 0) {
    return (
      <EmptyState
        title="No open invitations"
        description="Invitations you send from the setup steps or here appear in this list until they are accepted or expire."
        icon={Mail}
      />
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {invites.map((invite) => {
        const busy = busyId === invite.id;
        return (
          <li key={invite.id} className="space-y-2 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{invite.email}</p>
                <p className="text-xs text-muted-foreground">
                  {ASSIGNABLE_ROLE_LABELS[invite.role]} · expires <RelativeTime date={invite.expiresAt} />
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  disabled={busy}
                  onClick={() =>
                    run(
                      invite,
                      () => resendInviteAction({ circleId, invitationId: invite.id }),
                      `Invitation re-sent to ${invite.email}`,
                    )
                  }
                >
                  Resend
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  disabled={busy}
                  onClick={() =>
                    run(
                      invite,
                      () => revokeInviteAction({ circleId, invitationId: invite.id }),
                      `Invitation to ${invite.email} revoked`,
                    )
                  }
                >
                  Revoke
                </Button>
              </div>
            </div>
            {rowErrors[invite.id] && (
              <p role="alert" className="text-xs text-red-700 dark:text-red-400">
                {rowErrors[invite.id]}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
