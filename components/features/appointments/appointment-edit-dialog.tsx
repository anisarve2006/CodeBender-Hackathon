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
  deleteAppointmentAction,
  updateAppointmentAction,
} from '@/app/(app)/c/[circleId]/appointments/actions';
import {
  APPOINTMENT_STATUSES,
  STATUS_LABELS,
  editFormSchema,
  isoToLocal,
  localToIso,
  type EditFormValues,
} from '@/lib/schemas/appointments';
import type { AppointmentView } from '@/lib/data/appointments';

interface AppointmentEditDialogProps {
  circleId: string;
  appointment: AppointmentView | null;
  members: { userId: string; fullName: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentEditDialog({
  circleId,
  appointment,
  members,
  open,
  onOpenChange,
}: AppointmentEditDialogProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      title: appointment?.title ?? '',
      doctorName: appointment?.doctorName ?? '',
      specialty: appointment?.specialty ?? '',
      location: appointment?.location ?? '',
      startsLocal: appointment ? isoToLocal(appointment.startsAt) : '',
      endsLocal: appointment ? isoToLocal(appointment.endsAt) : '',
      accompaniedBy: appointment?.accompaniedBy ?? '',
      notes: appointment?.notes ?? '',
      sensitivity: appointment?.sensitivity ?? 'normal',
      status: appointment?.status ?? 'scheduled',
    },
  });

  React.useEffect(() => {
    if (appointment) {
      form.reset({
        title: appointment.title,
        doctorName: appointment.doctorName ?? '',
        specialty: appointment.specialty ?? '',
        location: appointment.location ?? '',
        startsLocal: isoToLocal(appointment.startsAt),
        endsLocal: isoToLocal(appointment.endsAt),
        accompaniedBy: appointment.accompaniedBy ?? '',
        notes: appointment.notes ?? '',
        sensitivity: appointment.sensitivity,
        status: appointment.status,
      });
    }
  }, [appointment, form]);

  if (!appointment) return null;
  const errors = form.formState.errors;

  async function onSubmit(values: EditFormValues) {
    if (!appointment) return;

    const start = new Date(localToIso(values.startsLocal));
    const end = new Date(localToIso(values.endsLocal));

    if (end.getTime() <= start.getTime()) {
      form.setError('endsLocal', { message: 'End time must be after start time' });
      return;
    }

    setSubmitting(true);
    const result = await updateAppointmentAction({
      circleId,
      appointmentId: appointment.id,
      title: values.title,
      doctorName: values.doctorName || undefined,
      specialty: values.specialty || undefined,
      location: values.location || undefined,
      startsAt: start,
      endsAt: end,
      accompaniedBy: values.accompaniedBy || null,
      notes: values.notes || undefined,
      sensitivity: values.sensitivity,
      status: values.status,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success('Appointment updated');
    onOpenChange(false);
    router.refresh();
  }

  async function onDelete() {
    if (!appointment) return;
    setSubmitting(true);

    const result = await deleteAppointmentAction({
      circleId,
      appointmentId: appointment.id,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success('Appointment deleted');
    setDeleteConfirmOpen(false);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
            <DialogDescription>
              Update schedule, doctor details, or appointment status.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
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
                <Label htmlFor="edit-doc">Doctor Name</Label>
                <Input id="edit-doc" className="min-h-11" {...form.register('doctorName')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-spec">Specialty</Label>
                <Input id="edit-spec" className="min-h-11" {...form.register('specialty')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-loc">Location</Label>
              <Input id="edit-loc" className="min-h-11" {...form.register('location')} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-start">Date & Time *</Label>
                <Input
                  id="edit-start"
                  type="datetime-local"
                  className="min-h-11"
                  {...form.register('startsLocal')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-end">End Time *</Label>
                <Input
                  id="edit-end"
                  type="datetime-local"
                  className="min-h-11"
                  {...form.register('endsLocal')}
                />
                {errors.endsLocal && (
                  <p className="text-xs text-red-700 dark:text-red-400">
                    {errors.endsLocal.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  className="min-h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...form.register('status')}
                >
                  {APPOINTMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-companion">Accompanying Person</Label>
                <select
                  id="edit-companion"
                  className="min-h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...form.register('accompaniedBy')}
                >
                  <option value="">No accompanying person</option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-notes">Notes or Instructions</Label>
              <Textarea id="edit-notes" rows={2} {...form.register('notes')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-sens">Privacy & Sensitivity</Label>
              <select
                id="edit-sens"
                className="min-h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...form.register('sensitivity')}
              >
                <option value="normal">Normal (Visible to all circle members)</option>
                <option value="restricted">Restricted (Visible to Owners & Coordinators only)</option>
              </select>
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
        title="Delete Appointment"
        description="Are you sure you want to remove this appointment? Unsent reminders will be cancelled."
        confirmLabel="Yes, delete"
        destructive
        onConfirm={onDelete}
      />
    </>
  );
}
