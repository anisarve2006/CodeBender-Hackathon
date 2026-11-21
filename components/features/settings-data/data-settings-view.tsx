'use client';

import * as React from 'react';
import { Download, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deleteCircleAction } from '@/app/(app)/c/[circleId]/settings/data/actions';
import { toast } from 'sonner';

interface DataSettingsViewProps {
  circleId: string;
  circleName: string;
  isOwner: boolean;
}

export function DataSettingsView({ circleId, circleName, isOwner }: DataSettingsViewProps) {
  const [typedName, setTypedName] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);

  const canConfirmDelete = typedName.trim().toLowerCase() === circleName.trim().toLowerCase();

  async function handleDelete() {
    if (!canConfirmDelete) return;

    try {
      setIsDeleting(true);
      const res = await deleteCircleAction(circleId, typedName);
      if (res && !res.ok) {
        toast.error(res.error || 'Failed to delete circle');
        setIsDeleting(false);
      }
    } catch {
      // If redirect happens, it won't be an error
    }
  }

  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            Owner Access Only
          </CardTitle>
          <CardDescription>
            Data export and circle deletion are restricted to circle owners in accordance with DPDP privacy principles.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Export Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export Circle Data
          </CardTitle>
          <CardDescription>
            Download a portable copy of all circle records, medical prescriptions, appointments, tasks, and document links (DPDP Act 2023 compliance).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The export includes care recipient profiles, medications with verbatim prescription instructions, appointment history, task accountability records, and 60-second secure document download URLs.
          </p>
          <a
            href={`/api/circles/${circleId}/export`}
            download
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            Download Data (JSON)
          </a>
        </CardContent>
      </Card>

      {/* Delete Card */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Permanently Delete Circle
          </CardTitle>
          <CardDescription>
            Irreversibly delete this care circle, purging all member associations, prescriptions, tasks, and private blob storage files.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Once deleted, all medical history, timeline entries, and stored scans for <strong>{circleName}</strong> cannot be recovered.
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Circle
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Confirm Permanent Deletion
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    This action is permanent and cannot be undone. To confirm, please type the exact circle name:{' '}
                    <strong className="text-foreground">{circleName}</strong>
                  </p>
                  <div className="pt-2">
                    <Label htmlFor="confirm-circle-name" className="text-xs font-semibold">
                      Circle Name:
                    </Label>
                    <Input
                      id="confirm-circle-name"
                      placeholder={circleName}
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setTypedName('')}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={!canConfirmDelete || isDeleting}
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting…' : 'I understand, permanently delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
