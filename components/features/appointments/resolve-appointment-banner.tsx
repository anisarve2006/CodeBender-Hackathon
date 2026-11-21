'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { resolveAppointmentSchema, type ResolveAppointmentInput } from '@/lib/schemas/appointments';
import { resolveAppointmentAction } from '@/app/(app)/c/[circleId]/appointments/actions';
import {
  EditAppointmentSheet,
  type EditableAppointment,
} from '@/components/features/appointments/edit-appointment-sheet';
import type { AppointmentMemberOption } from '@/components/features/appointments/quick-add-appointment';
import { emptyToUndefined } from '@/components/features/appointments/form-utils';

interface ResolveAppointmentBannerProps {
  circleId: string;
  appointment: EditableAppointment;
  members: AppointmentMemberOption[];
}

/**
 * "How did it go?" banner, shown on past appointments that are still marked as scheduled.
 * Wording is neutral: no doctor, specialty or document details are shown here.
 */
export function ResolveAppointmentBanner({
  circleId,
  appointment,
  members,
}: ResolveAppointmentBannerProps) {
  const router = useRouter();
  const [completeOpen, setCompleteOpen] = React.useState(false);
  const [rescheduleOpen, setRescheduleOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const form = useForm<ResolveAppointmentInput>({
    resolver: zodResolver(resolveAppointmentSchema),
    defaultValues: { outcome: 'completed', notes: '' },
  });

  const resolve = async (outcome: ResolveAppointmentInput['outcome'], notes?: string) => {
    setPending(true);
    const result = await resolveAppointmentAction({
      circleId,
      id: appointment.id,
      outcome,
      notes: emptyToUndefined(notes),
    });
    setPending(false);

    if (result.ok) {
      toast.success(outcome === 'completed' ? 'Marked as completed' : 'Marked as missed');
      setCompleteOpen(false);
      router.refresh();
      return;
    }
    toast.error(result.error);
  };

  return (
    <div
      role="region"
      aria-label="How did it go?"
      className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4"
    >
      <p className="text-sm font-semibold">How did it go?</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <Button
          variant="outline"
          className="min-h-11"
          disabled={pending}
          onClick={() => {
            form.reset({ outcome: 'completed', notes: '' });
            setCompleteOpen(true);
          }}
        >
          Completed
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={pending}
          onClick={() => resolve('missed')}
        >
          Missed
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={pending}
          onClick={() => setRescheduleOpen(true)}
        >
          Rescheduled
        </Button>
      </div>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark appointment as completed</DialogTitle>
            <DialogDescription>Add a short note if you like. This is optional.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((values) => resolve('completed', values.notes))}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="resolve-appt-notes">Notes</Label>
              <Textarea id="resolve-appt-notes" rows={4} {...form.register('notes')} />
              {form.formState.errors.notes && (
                <p className="text-sm text-destructive">{form.formState.errors.notes.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" className="min-h-11" disabled={pending}>
                {pending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <EditAppointmentSheet
        circleId={circleId}
        appointment={appointment}
        members={members}
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        reschedule
      />
    </div>
  );
}
