'use client';

import * as React from 'react';
import { Download, AlertTriangle, Trash2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { deleteCircleAction } from '@/app/(app)/c/[circleId]/settings/data/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface CircleDataSettingsViewProps {
  circleId: string;
  circleName: string;
}

export function CircleDataSettingsView({ circleId, circleName }: CircleDataSettingsViewProps) {
  const router = useRouter();
  const [exporting, setExporting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [confirmName, setConfirmName] = React.useState('');
  const [deleting, setDeleting] = React.useState(false);

  function handleExport() {
    setExporting(true);
    toast.info('Generating your complete ZIP archive...');

    const link = document.createElement('a');
    link.href = `/api/circles/${circleId}/export`;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setExporting(false);
    }, 3000);
  }

  async function handleDeleteCircle() {
    if (confirmName.trim().toLowerCase() !== circleName.trim().toLowerCase()) {
      toast.error('The entered name does not match the circle name.');
      return;
    }

    setDeleting(true);
    const res = await deleteCircleAction({
      circleId,
      confirmationName: confirmName.trim(),
    });
    setDeleting(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    toast.success('Care circle permanently deleted.');
    setDeleteDialogOpen(false);
    router.push('/');
    router.refresh();
  }

  const nameMatches = confirmName.trim().toLowerCase() === circleName.trim().toLowerCase();

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Export Section */}
      <div className="rounded-xl border bg-card p-6 space-y-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 flex-shrink-0">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Export Care Circle Data</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Download a complete archive containing all circle records (care recipient, appointments,
              prescriptions, medications, tasks, activity audit logs) formatted in readable JSON, along
              with all uploaded medical documents in a single ZIP file.
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3.5 text-xs text-muted-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>Compliant with the Digital Personal Data Protection (DPDP) Act 2023 portability rights.</span>
        </div>

        <div className="pt-2">
          <Button
            type="button"
            className="min-h-11"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                <span>Streaming ZIP Archive...</span>
              </div>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download Archive (ZIP)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Danger Zone: Delete Circle */}
      <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/30 dark:bg-red-950/20 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400 flex-shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-red-700 dark:text-red-400">
              Danger Zone: Delete Care Circle
            </h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Permanently delete this care circle, all associated members, schedules, prescriptions, and
              erase all stored documents from cloud storage. This action is irreversible.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="button"
            variant="destructive"
            className="min-h-11"
            onClick={() => {
              setConfirmName('');
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete This Circle...
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Confirm Permanent Deletion</DialogTitle>
            </div>
            <DialogDescription>
              This will permanently delete <strong>{circleName}</strong> and purge all private files and records.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="confirm-circle-name" className="text-xs">
              Type <strong className="text-foreground">{circleName}</strong> below to confirm:
            </Label>
            <Input
              id="confirm-circle-name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={circleName}
              className="min-h-11"
              autoFocus
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-11"
              disabled={!nameMatches || deleting}
              onClick={handleDeleteCircle}
            >
              {deleting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                  <span>Purging Circle Data...</span>
                </div>
              ) : (
                'Permanently Delete Circle'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
