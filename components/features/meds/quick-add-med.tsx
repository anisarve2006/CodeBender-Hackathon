'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
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
import { createMedicationAction } from '@/app/(app)/c/[circleId]/meds/actions';
import { medFormSchema, type MedFormValues } from '@/lib/schemas/medications';

interface QuickAddMedProps {
  circleId: string;
  members: { userId: string; fullName: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddMedDialog({
  circleId,
  members,
  open,
  onOpenChange,
}: QuickAddMedProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<MedFormValues>({
    resolver: zodResolver(medFormSchema),
    defaultValues: {
      name: '',
      strength: '',
      form: 'Tablets',
      instructionsAsWritten: '',
      prescribedBy: '',
      initialQuantity: 30,
      dailyUsage: 1,
      assignedTo: '',
    },
  });

  const errors = form.formState.errors;

  async function onSubmit(values: MedFormValues) {
    setSubmitting(true);
    const result = await createMedicationAction({
      circleId,
      name: values.name,
      strength: values.strength || undefined,
      form: values.form || undefined,
      instructionsAsWritten: values.instructionsAsWritten,
      prescribedBy: values.prescribedBy || undefined,
      initialQuantity: values.initialQuantity,
      dailyUsage: values.dailyUsage,
      assignedTo: values.assignedTo || null,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success('Medication added with refill countdown');
    form.reset();
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Medication & Refill Tracker</DialogTitle>
          <DialogDescription>
            Enter prescription details exactly as written. Refill countdown updates automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="med-name">Medicine Name *</Label>
            <Input
              id="med-name"
              placeholder="e.g. Amlodipine or Metformin"
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
              <Label htmlFor="med-strength">Strength</Label>
              <Input
                id="med-strength"
                placeholder="e.g. 5 mg or 500 mg"
                className="min-h-11"
                {...form.register('strength')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-form">Form</Label>
              <Input
                id="med-form"
                placeholder="e.g. Tablets, Drops, Syrup"
                className="min-h-11"
                {...form.register('form')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="med-instructions">
              Instructions (As written on prescription) *
            </Label>
            <Textarea
              id="med-instructions"
              rows={2}
              placeholder="e.g. 1 tablet once daily in the morning after food"
              aria-invalid={errors.instructionsAsWritten ? true : undefined}
              {...form.register('instructionsAsWritten')}
            />
            {errors.instructionsAsWritten && (
              <p className="text-xs text-red-700 dark:text-red-400">
                {errors.instructionsAsWritten.message}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Guardrail: Store instructions verbatim. Do not alter or summarize dosages.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="med-prescriber">Prescribed By Doctor</Label>
            <Input
              id="med-prescriber"
              placeholder="e.g. Dr. S. Mehta"
              className="min-h-11"
              {...form.register('prescribedBy')}
            />
          </div>

          <div className="rounded-lg border p-3.5 bg-muted/20 space-y-3">
            <p className="text-xs font-semibold text-foreground">Supply & Refill Settings</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="med-quantity">Units on Hand</Label>
                <Input
                  id="med-quantity"
                  type="number"
                  min="0"
                  className="min-h-11"
                  {...form.register('initialQuantity', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="med-usage">Daily Usage (Units/Day)</Label>
                <Input
                  id="med-usage"
                  type="number"
                  min="1"
                  className="min-h-11"
                  {...form.register('dailyUsage', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="med-assignee">Refill Coordinator</Label>
              <select
                id="med-assignee"
                className="min-h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...form.register('assignedTo')}
              >
                <option value="">Any available family member</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="min-h-11" disabled={submitting}>
              {submitting ? 'Saving…' : 'Add Medication'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
