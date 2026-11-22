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
import { recordRefillAction } from '@/app/(app)/c/[circleId]/meds/actions';
import { refillFormSchema, type RefillFormValues } from '@/lib/schemas/medications';
import type { MedicationItemView } from '@/lib/data/medications';

interface RefillDialogProps {
  circleId: string;
  medication: MedicationItemView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_AMOUNTS = [15, 30, 60, 90];

export function RefillDialog({
  circleId,
  medication,
  open,
  onOpenChange,
}: RefillDialogProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<RefillFormValues>({
    resolver: zodResolver(refillFormSchema),
    defaultValues: {
      quantityAdded: 30,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({ quantityAdded: 30 });
    }
  }, [open, form]);

  if (!medication || !medication.refill) return null;
  const errors = form.formState.errors;

  async function onSubmit(values: RefillFormValues) {
    if (!medication || !medication.refill) return;
    setSubmitting(true);

    const result = await recordRefillAction({
      circleId,
      refillId: medication.refill.id,
      quantityAdded: values.quantityAdded,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(`Recorded refill: +${values.quantityAdded} units added`);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Medicine Refilled</DialogTitle>
          <DialogDescription>
            Record newly received supply for <strong>{medication.name}</strong>. The countdown will update automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="rounded-lg bg-muted/30 p-3 space-y-1 text-xs">
            <p className="text-muted-foreground">
              Current stock: <strong className="text-foreground">{medication.refill.quantityOnHand} units</strong>
            </p>
            <p className="text-muted-foreground">
              Daily consumption: <strong className="text-foreground">{medication.refill.dailyUsage} unit(s) per day</strong>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refill-quantity">Units Received / Added *</Label>
            <Input
              id="refill-quantity"
              type="number"
              min="1"
              className="min-h-11"
              aria-invalid={errors.quantityAdded ? true : undefined}
              {...form.register('quantityAdded', { valueAsNumber: true })}
            />
            {errors.quantityAdded && (
              <p className="text-xs text-red-700 dark:text-red-400">
                {errors.quantityAdded.message}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              {QUICK_AMOUNTS.map((amt) => (
                <Button
                  key={amt}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 flex-1 text-xs"
                  onClick={() => form.setValue('quantityAdded', amt)}
                >
                  +{amt}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="min-h-11" disabled={submitting}>
              {submitting ? 'Saving…' : 'Confirm Refill'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
