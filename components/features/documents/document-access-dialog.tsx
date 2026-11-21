'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  getDocumentAccessLogsAction,
  getDocumentGrantsAction,
  getCircleMembersForGrantAction,
  grantDocumentAccessAction,
  revokeDocumentAccessAction,
} from '@/app/(app)/c/[circleId]/documents/actions';
import { toast } from 'sonner';
import { ShieldAlert, UserPlus, Trash2, Eye, History, ShieldCheck } from 'lucide-react';
import type { DocumentListItem } from '@/lib/data/documents';

interface DocumentAccessDialogProps {
  circleId: string;
  document: DocumentListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
}

export function DocumentAccessDialog({
  circleId,
  document,
  open,
  onOpenChange,
  onRefresh,
}: DocumentAccessDialogProps) {
  const [activeTab, setActiveTab] = React.useState<'grants' | 'logs'>('grants');
  const [loading, setLoading] = React.useState(false);
  const [grants, setGrants] = React.useState<{ user_id: string; full_name: string; granted_at: string }[]>([]);
  const [logs, setLogs] = React.useState<{ id: number; user_id: string; full_name: string; action: string; accessed_at: string }[]>([]);
  const [circleMembers, setCircleMembers] = React.useState<{ userId: string; fullName: string; role: string }[]>([]);
  const [selectedMemberId, setSelectedMemberId] = React.useState('');
  const [granting, setGranting] = React.useState(false);

  const documentId = document?.id;

  React.useEffect(() => {
    if (!open || !documentId) return;

    let active = true;

    Promise.all([
      getDocumentGrantsAction({ circleId, documentId }),
      getDocumentAccessLogsAction({ circleId, documentId }),
      getCircleMembersForGrantAction({ circleId }),
    ])
      .then(([grantsRes, logsRes, membersRes]) => {
        if (!active) return;
        if (grantsRes.ok && grantsRes.data) setGrants(grantsRes.data);
        if (logsRes.ok && logsRes.data) setLogs(logsRes.data);
        if (membersRes.ok && membersRes.data) setCircleMembers(membersRes.data);
        setLoading(false);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to load details');
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, circleId, documentId]);

  if (!document) return null;

  async function handleGrant() {
    if (!selectedMemberId || !documentId) return;
    setGranting(true);

    const res = await grantDocumentAccessAction({
      circleId,
      documentId,
      targetUserId: selectedMemberId,
    });
    setGranting(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    toast.success('Access granted successfully');
    setSelectedMemberId('');
    // Refresh grants
    const nextGrants = await getDocumentGrantsAction({ circleId, documentId });
    if (nextGrants.ok && nextGrants.data) setGrants(nextGrants.data);
    onRefresh?.();
  }

  async function handleRevoke(userId: string) {
    if (!documentId) return;

    const res = await revokeDocumentAccessAction({
      circleId,
      documentId,
      targetUserId: userId,
    });

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    toast.success('Access revoked');
    setGrants((prev) => prev.filter((g) => g.user_id !== userId));
    onRefresh?.();
  }

  // Filter out members who already have access
  const grantedUserIds = new Set(grants.map((g) => g.user_id));
  const availableMembers = circleMembers.filter(
    (m) => !grantedUserIds.has(m.userId) && m.role !== 'owner' && m.role !== 'coordinator',
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <ShieldAlert className="h-5 w-5" />
            <DialogTitle>Document Access & Audit</DialogTitle>
          </div>
          <DialogDescription>
            Manage visibility permissions and review access logs for <strong>{document.title}</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex border-b text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('grants')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'grants'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Granted Members ({grants.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'logs'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Access Audit Log ({logs.length})</span>
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent animate-spin rounded-full mx-auto mb-2" />
            <span>Loading permissions...</span>
          </div>
        ) : activeTab === 'grants' ? (
          <div className="space-y-4 pt-2">
            <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg">
              Circle <strong>Owner</strong> and <strong>Coordinators</strong> always retain access to all documents.
              Caregivers and contributors only have access if explicitly added below.
            </div>

            {/* Grant member selector */}
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="grant-member-select">Grant Access to Member</Label>
              <div className="flex gap-2">
                <select
                  id="grant-member-select"
                  className="flex-1 h-11 px-3 rounded-md border bg-background text-sm cursor-pointer"
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  disabled={availableMembers.length === 0 || granting}
                >
                  <option value="">
                    {availableMembers.length === 0
                      ? 'All eligible members already granted'
                      : 'Select family member...'}
                  </option>
                  {availableMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.fullName} ({m.role})
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  className="min-h-11"
                  disabled={!selectedMemberId || granting}
                  onClick={handleGrant}
                >
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  Grant
                </Button>
              </div>
            </div>

            {/* List of granted members */}
            <div className="space-y-2 pt-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Currently Granted Members
              </Label>
              {grants.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 italic">
                  No additional members granted access yet.
                </p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {grants.map((g) => (
                    <div
                      key={g.user_id}
                      className="flex items-center justify-between p-3 text-sm hover:bg-muted/20"
                    >
                      <div>
                        <p className="font-medium">{g.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Granted on {new Date(g.granted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => handleRevoke(g.user_id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Revoke
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Logs Tab */
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Audit trail of 60-second signed download URLs issued for this document.
            </p>
            {logs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center italic">
                No access logs recorded yet.
              </p>
            ) : (
              <div className="divide-y rounded-lg border max-h-60 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Eye className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{log.full_name}</p>
                        <p className="text-muted-foreground text-[11px]">Action: {log.action}</p>
                      </div>
                    </div>
                    <span className="text-muted-foreground text-[11px]">
                      {new Date(log.accessed_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
