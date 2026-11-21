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
import {
  createAppointmentAction,
  getAppointmentFormOptionsAction,
} from '@/app/(app)/c/[circleId]/appointments/actions';
import {
  defaultAppointmentTimes,
  localToIso,
  quickAddFormSchema,
  type QuickAddFormValues,
} from '@/lib/schemas/appointments';

export interface QuickAddAppointmentProps {
  circleId: string;
  members?: { userId: string; fullName: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddAppointmentDialog({
  circleId,
  members,
  open,
  onOpenChange,
}: QuickAddAppointmentProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [fetchedMembers, setFetchedMembers] = React.useState<{ userId: string; fullName: string }[]>([]);

  React.useEffect(() => {
    if (!open || (members && members.length > 0)) return;
    let cancelled = false;

    getAppointmentFormOptionsAction({ circleId }).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setFetchedMembers(res.data.members);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, circleId, members]);

  const memberList = members && members.length > 0 ? members : fetchedMembers;

  const defaultTimes = defaultAppointmentTimes();
  const form = useForm<QuickAddFormValues>({
    resolver: zodResolver(quickAddFormSchema),
    defaultValues: {
      title: '',
      doctorName: '',
      specialty: '',
      location: '',
      startsLocal: defaultTimes.startsLocal,
      endsLocal: defaultTimes.endsLocal,
      accompaniedBy: '',
      notes: '',
      sensitivity: 'normal',
      createPrepTask: true,
      createAccompanyTask: true,
    },
  });

  const errors = form.formState.errors;

  async function onSubmit(values: QuickAddFormValues) {
    const start = new Date(localToIso(values.startsLocal));
    const end = new Date(localToIso(values.endsLocal));

    if (end.getTime() <= start.getTime()) {
      form.setError('endsLocal', { message: 'End time must be after start time' });
      return;
    }

    setSubmitting(true);
    const result = await createAppointmentAction({
      circleId,
      title: values.title,
      doctorName: values.doctorName || undefined,
      specialty: values.specialty || undefined,
      location: values.location || undefined,
      startsAt: start,
      endsAt: end,
      accompaniedBy: values.accompaniedBy || null,
      notes: values.notes || undefined,
      sensitivity: values.sensitivity,
      createPrepTask: values.createPrepTask,
      createAccompanyTask: values.createAccompanyTask,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success('Appointment scheduled');
    form.reset();
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Doctor Appointment</DialogTitle>
          <DialogDescription>
            Add a visit, coordinate who accompanies, and schedule reminders.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="appt-title">Title *</Label>
            <Input
              id="appt-title"
              placeholder="e.g. Cardiology review or Dental checkup"
              className="min-h-11"
              aria-invalid={errors.title ? true : undefined}
              {...form.register('title')}
            />
            {errors.title && (
              <p className="text-xs text-red-700 dark:text-red-400">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="appt-doc">Doctor Name</Label>
              <Input
                id="appt-doc"
                placeholder="Dr. S. Mehta"
                className="min-h-11"
                {...form.register('doctorName')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appt-spec">Specialty</Label>
              <Input
                id="appt-spec"
                placeholder="e.g. Cardiologist"
                className="min-h-11"
                {...form.register('specialty')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="appt-loc">Location</Label>
            <Input
              id="appt-loc"
              placeholder="Hospital or clinic name, room/floor"
              className="min-h-11"
              {...form.register('location')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="appt-start">Date & Time *</Label>
              <Input
                id="appt-start"
                type="datetime-local"
                className="min-h-11"
                {...form.register('startsLocal')}
              />
              {errors.startsLocal && (
                <p className="text-xs text-red-700 dark:text-red-400">
                  {errors.startsLocal.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appt-end">End Time *</Label>
              <Input
                id="appt-end"
                type="datetime-local"
                className="min-h-11"
                {...form.register('endsLocal')}
              />
              {errors.endsLocal && (
                <p className="text-xs text-red-700 dark:text-red-400">{errors.endsLocal.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="appt-companion">Accompanying Person</Label>
            <select
              id="appt-companion"
              className="min-h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...form.register('accompaniedBy')}
            >
              <option value="">No accompanying person assigned</option>
              {memberList.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="appt-notes">Notes or Questions for Doctor</Label>
            <Textarea
              id="appt-notes"
              rows={2}
              placeholder="e.g. Discuss recent blood pressure fluctuations, ask about refill"
              {...form.register('notes')}
            />
          </div>

          <div className="space-y-2 rounded-lg border p-3.5 bg-muted/20">
            <p className="text-xs font-semibold text-foreground">Automatic Care Coordination Tasks</p>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary"
                {...form.register('createPrepTask')}
              />
              <span>Create task: <strong>Prepare medical records</strong> before the visit</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary"
                {...form.register('createAccompanyTask')}
              />
              <span>Create task: <strong>Accompany care recipient</strong> to the visit</span>
            </label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="appt-sens">Privacy & Sensitivity</Label>
            <select
              id="appt-sens"
              className="min-h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...form.register('sensitivity')}
            >
              <option value="normal">Normal (Visible to all circle members)</option>
              <option value="restricted">Restricted (Visible to Owners & Coordinators only)</option>
            </select>
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
              {submitting ? 'Saving…' : 'Schedule Appointment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
