'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Pill } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createMedicationSchema, MEDICATION_COPY } from '@/lib/schemas/medications';
import { createMedicationAction } from '@/app/(app)/c/[circleId]/meds/actions';

/**
 * Quick-add medicine dialog. Owner: Member B.
 * instructionsAsWritten is sent exactly as typed (no trimming or rewriting).
 */

type MedicationFormValues = z.input<typeof createMedicationSchema>;

interface QuickAddMedicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  circleId: string;
}

const inputClass = 'min-h-11';

function defaultValues(circleId: string): MedicationFormValues {
  return {
    circleId,
    name: '',
    instructionsAsWritten: '',
    initialQuantity: 0,
    dailyUsage: 1,
  };
}

/** Optional text: blank becomes undefined. Non-blank text is passed through unchanged. */
function optionalText(value: string | undefined | null): string | undefined {
  return value && value.trim() ? value : undefined;
}

export function QuickAddMedicationDialog({ open, onOpenChange, circleId }: QuickAddMedicationDialogProps) {
  const router = useRouter();
  const form = useForm<MedicationFormValues>({
    resolver: zodResolver(createMedicationSchema),
    defaultValues: defaultValues(circleId),
  });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = async (values: MedicationFormValues) => {
    const result = await createMedicationAction({
      ...values,
      circleId,
      strength: optionalText(values.strength),
      form: optionalText(values.form),
      prescribedBy: optionalText(values.prescribedBy),
      startDate: optionalText(values.startDate),
      endDate: optionalText(values.endDate),
    });

    if (result.ok) {
      toast.success('Medicine added');
      reset(defaultValues(circleId));
      onOpenChange(false);
      router.refresh();
      return;
    }

    if (result.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (messages[0]) {
          setError(field as keyof MedicationFormValues, { message: messages[0] });
        }
      }
    }
    toast.error(result.error);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Medicine</DialogTitle>
          <DialogDescription>
            Copy the instructions exactly as written on the prescription.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="med-name">Medicine name *</Label>
            <Input id="med-name" className={inputClass} aria-invalid={!!errors.name} {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="med-strength">Strength</Label>
              <Input id="med-strength" className={inputClass} {...register('strength')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-form">Form</Label>
              <Input id="med-form" className={inputClass} placeholder="tablet, syrup, …" {...register('form')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="med-instructions">{MEDICATION_COPY.asWrittenLabel} *</Label>
            <Textarea
              id="med-instructions"
              rows={4}
              aria-invalid={!!errors.instructionsAsWritten}
              {...register('instructionsAsWritten')}
            />
            {errors.instructionsAsWritten && (
              <p className="text-sm text-destructive">{errors.instructionsAsWritten.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="med-prescribed-by">Prescribed by</Label>
            <Input id="med-prescribed-by" className={inputClass} {...register('prescribedBy')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="med-start">Start date</Label>
              <Input id="med-start" type="date" className={inputClass} {...register('startDate')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-end">End date</Label>
              <Input
                id="med-end"
                type="date"
                className={inputClass}
                aria-invalid={!!errors.endDate}
                {...register('endDate')}
              />
              {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="med-quantity">Quantity on hand</Label>
              <Input
                id="med-quantity"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                className={inputClass}
                {...register('initialQuantity')}
              />
              {errors.initialQuantity && (
                <p className="text-sm text-destructive">{errors.initialQuantity.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-daily">Units used per day</Label>
              <Input
                id="med-daily"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                className={inputClass}
                aria-describedby="med-daily-help"
                {...register('dailyUsage')}
              />
              <p id="med-daily-help" className="text-xs text-muted-foreground">
                Used only for the refill countdown.
              </p>
              {errors.dailyUsage && <p className="text-sm text-destructive">{errors.dailyUsage.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" className="min-h-11" disabled={isSubmitting}>
              <Pill className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? 'Saving…' : 'Add medicine'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Trigger button plus dialog, for the medicines page. */
export function QuickAddMedicationButton({ circleId }: { circleId: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button className="min-h-11" onClick={() => setOpen(true)}>
        <Pill className="h-4 w-4" aria-hidden="true" />
        Add medicine
      </Button>
      <QuickAddMedicationDialog open={open} onOpenChange={setOpen} circleId={circleId} />
    </>
  );
}
