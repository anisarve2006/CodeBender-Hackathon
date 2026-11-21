'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, UserMinus, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  grantRestrictedAccessAction,
  listDocumentViewersAction,
  revokeRestrictedAccessAction,
} from '@/app/(app)/c/[circleId]/documents/actions';

export interface GrantableMember {
  userId: string;
  fullName: string;
  role: 'caregiver' | 'care_recipient';
}

interface Grant {
  userId: string;
  fullName: string;
  grantedAt: Date;
}

interface ViewEntry {
  userId: string;
  fullName: string;
  action: string;
  accessedAt: Date;
}

const ROLE_LABELS: Record<GrantableMember['role'], string> = {
  caregiver: 'Caregiver',
  care_recipient: 'Care recipient',
};

interface GrantAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  circleId: string;
  documentId: string;
  documentTitle: string;
  members: GrantableMember[];
  timezone: string;
}

function formatWhen(value: Date | string, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(value));
}

export function GrantAccessDialog({
  open,
  onOpenChange,
  circleId,
  documentId,
  documentTitle,
  members,
  timezone,
}: GrantAccessDialogProps) {
  const router = useRouter();
  const [grants, setGrants] = React.useState<Grant[]>([]);
  const [views, setViews] = React.useState<ViewEntry[]>([]);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const loadViewers = React.useCallback(async () => {
    setLoading(true);
    const result = await listDocumentViewersAction({ circleId, documentId });
    setLoading(false);
    if (result.ok) {
      setGrants(result.data.grants);
      setViews(result.data.views);
    } else {
      toast.error(result.error);
    }
  }, [circleId, documentId]);

  React.useEffect(() => {
    let ignore = false;
    if (open) {
      void Promise.resolve().then(() => {
        if (!ignore) setLoading(true);
      });
      listDocumentViewersAction({ circleId, documentId }).then((result) => {
        if (!ignore) {
          setLoading(false);
          if (result.ok) {
            setGrants(result.data.grants);
            setViews(result.data.views);
          } else {
            toast.error(result.error);
          }
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [open, circleId, documentId]);

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelected([]);
    }
    onOpenChange(nextOpen);
  };

  const grantedIds = new Set(grants.map((grant) => grant.userId));
  const available = members.filter((member) => !grantedIds.has(member.userId));

  const toggle = (userId: string) => {
    setSelected((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  };

  const handleGrant = async () => {
    if (selected.length === 0) {
      toast.error('Choose at least one person.');
      return;
    }
    setBusy(true);
    const result = await grantRestrictedAccessAction({
      circleId,
      documentId,
      userIds: selected,
    });
    setBusy(false);
    if (result.ok) {
      toast.success('Access granted');
      router.refresh();
      await loadViewers();
      setSelected([]);
      return;
    }
    toast.error(result.error);
  };

  const handleRevoke = async (userId: string) => {
    setBusy(true);
    const result = await revokeRestrictedAccessAction({ circleId, documentId, userId });
    setBusy(false);
    if (result.ok) {
      toast.success('Access removed');
      router.refresh();
      await loadViewers();
      return;
    }
    toast.error(result.error);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Access for “{documentTitle}”</DialogTitle>
          <DialogDescription>
            Choose who can open this restricted document. Access is logged.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading access list…</p>
        ) : (
          <div className="space-y-6">
            <section aria-labelledby="grants-heading" className="space-y-2">
              <h3 id="grants-heading" className="text-sm font-semibold">
                Has access
              </h3>
              {grants.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Only owners and coordinators can see this document right now.
                </p>
              ) : (
                <ul className="space-y-2">
                  {grants.map((grant) => (
                    <li
                      key={grant.userId}
                      className="flex min-h-11 items-center justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate">
                        {grant.fullName}
                        <span className="block text-xs text-muted-foreground">
                          Granted {formatWhen(grant.grantedAt, timezone)}
                        </span>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-11"
                        disabled={busy}
                        onClick={() => handleRevoke(grant.userId)}
                      >
                        <UserMinus className="h-4 w-4" aria-hidden="true" />
                        Remove {grant.fullName}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {available.length > 0 && (
              <section aria-labelledby="grant-heading" className="space-y-2">
                <h3 id="grant-heading" className="text-sm font-semibold">
                  Grant access to
                </h3>
                <div className="space-y-1">
                  {available.map((member) => (
                    <label
                      key={member.userId}
                      className="flex min-h-11 items-center gap-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="h-5 w-5"
                        checked={selected.includes(member.userId)}
                        onChange={() => toggle(member.userId)}
                      />
                      <span>
                        {member.fullName}{' '}
                        <span className="text-muted-foreground">
                          ({ROLE_LABELS[member.role]})
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <Button
                  className="min-h-11"
                  disabled={busy || selected.length === 0}
                  onClick={handleGrant}
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Grant access
                </Button>
              </section>
            )}

            <section aria-labelledby="viewed-heading" className="space-y-2">
              <h3 id="viewed-heading" className="flex items-center gap-2 text-sm font-semibold">
                <Eye className="h-4 w-4" aria-hidden="true" />
                Viewed by
              </h3>
              {views.length === 0 ? (
                <p className="text-sm text-muted-foreground">No one has opened this yet.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {views.map((view, index) => (
                    <li key={`${view.userId}-${index}`} className="flex justify-between gap-3">
                      <span className="truncate">{view.fullName}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatWhen(view.accessedAt, timezone)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
