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
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { recordAppointmentOutcomeAction } from '@/app/(app)/c/[circleId]/appointments/actions';
import {
  isoToLocal,
  localToIso,
  outcomeFormSchema,
  type OutcomeFormValues,
} from '@/lib/schemas/appointments';
import type { AppointmentView } from '@/lib/data/appointments';
import Link from 'next/link';
import { FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppointmentOutcomeDialogProps {
  circleId: string;
  appointment: AppointmentView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentOutcomeDialog({
  circleId,
  appointment,
  open,
  onOpenChange,
}: AppointmentOutcomeDialogProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [selectedStatus, setSelectedStatus] = React.useState<'completed' | 'missed' | 'rescheduled'>('completed');

  const form = useForm<OutcomeFormValues>({
    resolver: zodResolver(outcomeFormSchema),
    defaultValues: {
      status: 'completed',
      notes: '',
      rescheduleStartsLocal: appointment ? isoToLocal(appointment.startsAt) : '',
      rescheduleEndsLocal: appointment ? isoToLocal(appointment.endsAt) : '',
    },
  });

  React.useEffect(() => {
    if (!appointment || !open) return;
    form.reset({
      status: 'completed',
      notes: appointment.notes || '',
      rescheduleStartsLocal: isoToLocal(appointment.startsAt),
      rescheduleEndsLocal: isoToLocal(appointment.endsAt),
    });
  }, [appointment, open, form]);

  if (!appointment) return null;
  const errors = form.formState.errors;

  async function onSubmit(values: OutcomeFormValues) {
    if (!appointment) return;

    if (values.status === 'rescheduled') {
      if (!values.rescheduleStartsLocal || !values.rescheduleEndsLocal) {
        form.setError('rescheduleEndsLocal', { message: 'Pick new start and end times' });
        return;
      }
      const start = new Date(localToIso(values.rescheduleStartsLocal));
      const end = new Date(localToIso(values.rescheduleEndsLocal));
      if (end.getTime() <= start.getTime()) {
        form.setError('rescheduleEndsLocal', {
          message: 'Rescheduled end time must be after the start time',
        });
        return;
      }
    }

    setSubmitting(true);
    const result = await recordAppointmentOutcomeAction({
      circleId,
      appointmentId: appointment.id,
      status: values.status,
      notes: values.notes || undefined,
      rescheduleStartsAt:
        values.status === 'rescheduled' && values.rescheduleStartsLocal
          ? new Date(localToIso(values.rescheduleStartsLocal))
          : undefined,
      rescheduleEndsAt:
        values.status === 'rescheduled' && values.rescheduleEndsLocal
          ? new Date(localToIso(values.rescheduleEndsLocal))
          : undefined,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(
      values.status === 'completed'
        ? 'Appointment marked as completed'
        : values.status === 'rescheduled'
          ? 'Appointment rescheduled'
          : 'Appointment marked as missed',
    );
    onOpenChange(false);
    router.refresh();
  }

  function handleStatusChange(status: 'completed' | 'missed' | 'rescheduled') {
    setSelectedStatus(status);
    form.setValue('status', status);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How did the appointment go?</DialogTitle>
          <DialogDescription>
            Update status for <strong>{appointment.title}</strong> with{' '}
            {appointment.doctorName || 'the doctor'}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label>Visit Outcome</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange('completed')}
                className={cn(
                  'flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium cursor-pointer transition-colors',
                  selectedStatus === 'completed'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'hover:bg-muted',
                )}
              >
                Completed
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('rescheduled')}
                className={cn(
                  'flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium cursor-pointer transition-colors',
                  selectedStatus === 'rescheduled'
                    ? 'border-amber-600 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'hover:bg-muted',
                )}
              >
                Rescheduled
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('missed')}
                className={cn(
                  'flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium cursor-pointer transition-colors',
                  selectedStatus === 'missed'
                    ? 'border-red-600 bg-red-50 text-red-900 dark:bg-red-950/60 dark:text-red-300'
                    : 'hover:bg-muted',
                )}
              >
                Missed
              </button>
            </div>
          </div>

          {selectedStatus === 'rescheduled' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border">
              <div className="space-y-1.5">
                <Label htmlFor="reschedule-start">New Date & Time *</Label>
                <Input
                  id="reschedule-start"
                  type="datetime-local"
                  className="min-h-11"
                  {...form.register('rescheduleStartsLocal')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reschedule-end">New End Time *</Label>
                <Input
                  id="reschedule-end"
                  type="datetime-local"
                  className="min-h-11"
                  {...form.register('rescheduleEndsLocal')}
                />
                {errors.rescheduleEndsLocal && (
                  <p className="text-xs text-red-700 dark:text-red-400">
                    {errors.rescheduleEndsLocal.message}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="outcome-notes">
              {selectedStatus === 'completed'
                ? 'Doctor Consultation Summary / Advice'
                : 'Reason / Follow-up Notes'}
            </Label>
            <Textarea
              id="outcome-notes"
              rows={3}
              placeholder="e.g. Doctor changed dosage for BP medicine, requested blood test in 2 weeks"
              {...form.register('notes')}
            />
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              Received a physical prescription or report?
            </div>
            <Link
              href={`/c/${circleId}/documents`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'min-h-11 text-xs')}
            >
              <FileUp className="h-3.5 w-3.5 mr-1" />
              Upload Report
            </Link>
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
              {submitting ? 'Saving…' : 'Save Visit Outcome'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
