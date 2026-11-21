'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  deleteMedicationAction,
  updateMedicationAction,
} from '@/app/(app)/c/[circleId]/meds/actions';
import { editMedFormSchema, type EditMedFormValues } from '@/lib/schemas/medications';
import type { MedicationItemView } from '@/lib/data/medications';

interface EditMedDialogProps {
  circleId: string;
  medication: MedicationItemView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMedDialog({
  circleId,
  medication,
  open,
  onOpenChange,
}: EditMedDialogProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  const form = useForm<EditMedFormValues>({
    resolver: zodResolver(editMedFormSchema),
    defaultValues: {
      name: medication?.name ?? '',
      strength: medication?.strength ?? '',
      form: medication?.form ?? 'Tablets',
      instructionsAsWritten: medication?.instructionsAsWritten ?? '',
      prescribedBy: medication?.prescribedBy ?? '',
      isActive: medication?.isActive ?? true,
    },
  });

  const isActive = form.watch('isActive');

  React.useEffect(() => {
    if (medication && open) {
      form.reset({
        name: medication.name,
        strength: medication.strength ?? '',
        form: medication.form ?? 'Tablets',
        instructionsAsWritten: medication.instructionsAsWritten,
        prescribedBy: medication.prescribedBy ?? '',
        isActive: medication.isActive,
      });
    }
  }, [medication, open, form]);

  if (!medication) return null;
  const errors = form.formState.errors;

  async function onSubmit(values: EditMedFormValues) {
    if (!medication) return;
    setSubmitting(true);

    const result = await updateMedicationAction({
      circleId,
      medicationId: medication.id,
      name: values.name,
      strength: values.strength || undefined,
      form: values.form || undefined,
      instructionsAsWritten: values.instructionsAsWritten,
      prescribedBy: values.prescribedBy || undefined,
      isActive: values.isActive,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success('Medication updated');
    onOpenChange(false);
    router.refresh();
  }

  async function onDelete() {
    if (!medication) return;
    setSubmitting(true);

    const result = await deleteMedicationAction({
      circleId,
      medicationId: medication.id,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success('Medication removed');
    setDeleteConfirmOpen(false);
    onOpenChange(false);
    router.refresh();
  }

  function handleActiveToggle(active: boolean) {
    form.setValue('isActive', active, { shouldDirty: true });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Medication</DialogTitle>
            <DialogDescription>
              Update prescription instructions or status for <strong>{medication.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="edit-med-name">Medicine Name *</Label>
              <Input
                id="edit-med-name"
                className="min-h-11"
                aria-invalid={errors.name ? true : undefined}
                {...form.register('name')}
              />
              {errors.name && (
                <p className="text-xs text-red-700 dark:text-red-400">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-med-strength">Strength</Label>
                <Input
                  id="edit-med-strength"
                  className="min-h-11"
                  {...form.register('strength')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-med-form">Form</Label>
                <Input id="edit-med-form" className="min-h-11" {...form.register('form')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-med-instructions">
                Instructions (As written on prescription) *
              </Label>
              <Textarea
                id="edit-med-instructions"
                rows={2}
                aria-invalid={errors.instructionsAsWritten ? true : undefined}
                {...form.register('instructionsAsWritten')}
              />
              {errors.instructionsAsWritten && (
                <p className="text-xs text-red-700 dark:text-red-400">
                  {errors.instructionsAsWritten.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-med-prescriber">Prescribed By Doctor</Label>
              <Input
                id="edit-med-prescriber"
                className="min-h-11"
                {...form.register('prescribedBy')}
              />
            </div>

            <div className="space-y-2 rounded-lg border p-3.5 bg-muted/20">
              <Label className="text-xs font-semibold">Active Status</Label>
              <div className="flex items-center gap-4 text-xs">
                <button
                  type="button"
                  onClick={() => handleActiveToggle(true)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer ${
                    isActive ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-muted'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-primary' : 'bg-muted-foreground'}`} />
                  <span>Active prescription</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleActiveToggle(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer ${
                    !isActive ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-muted'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${!isActive ? 'bg-primary' : 'bg-muted-foreground'}`} />
                  <span>Discontinued / Past medicine</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="min-h-11"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="min-h-11" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Medication"
        description="Are you sure you want to remove this medication and its refill tracker?"
        confirmLabel="Yes, delete"
        destructive
        onConfirm={onDelete}
      />
    </>
  );
}
