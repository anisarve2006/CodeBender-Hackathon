'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { updateAppointmentSchema } from '@/lib/schemas/appointments';
import { updateAppointmentAction } from '@/app/(app)/c/[circleId]/appointments/actions';
import {
  emptyToUndefined,
  fromLocalInputValue,
  toLocalInputValue,
} from '@/components/features/appointments/form-utils';
import type { AppointmentMemberOption } from '@/components/features/appointments/quick-add-appointment';

type EditFormValues = z.input<typeof updateAppointmentSchema>;

/** The fields of an appointment row that the edit sheet needs. */
export interface EditableAppointment {
  id: string;
  title: string;
  doctorName: string | null;
  specialty: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  accompaniedBy: string | null;
  notes: string | null;
  sensitivity: 'normal' | 'restricted';
}

interface EditAppointmentSheetProps {
  circleId: string;
  appointment: EditableAppointment;
  members: AppointmentMemberOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, saving also sets the status back to 'scheduled' (used for "Rescheduled"). */
  reschedule?: boolean;
}

const inputClass = 'min-h-11';

export function EditAppointmentSheet({
  circleId,
  appointment,
  members,
  open,
  onOpenChange,
  reschedule = false,
}: EditAppointmentSheetProps) {
  const router = useRouter();
  const form = useForm<EditFormValues>({
    resolver: zodResolver(updateAppointmentSchema),
    defaultValues: {
      id: appointment.id,
      circleId,
      title: appointment.title,
      doctorName: appointment.doctorName ?? '',
      specialty: appointment.specialty ?? '',
      location: appointment.location ?? '',
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      accompaniedBy: appointment.accompaniedBy ?? '',
      notes: appointment.notes ?? '',
      sensitivity: appointment.sensitivity,
    },
  });
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = async (values: EditFormValues) => {
    const result = await updateAppointmentAction({
      id: appointment.id,
      circleId,
      title: values.title,
      doctorName: emptyToUndefined(values.doctorName),
      specialty: emptyToUndefined(values.specialty),
      location: emptyToUndefined(values.location),
      notes: emptyToUndefined(values.notes),
      accompaniedBy: emptyToUndefined(values.accompaniedBy),
      startsAt: values.startsAt,
      endsAt: values.endsAt,
      sensitivity: values.sensitivity,
      ...(reschedule ? { status: 'scheduled' as const } : {}),
    });

    if (result.ok) {
      toast.success(reschedule ? 'Appointment rescheduled' : 'Appointment updated');
      onOpenChange(false);
      router.refresh();
      return;
    }

    if (result.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (messages[0]) {
          setError(field as keyof EditFormValues, { message: messages[0] });
        }
      }
    }
    toast.error(result.error);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{reschedule ? 'Reschedule appointment' : 'Edit appointment'}</SheetTitle>
          <SheetDescription>
            {reschedule
              ? 'Set the new date and time. The appointment will be marked as scheduled again.'
              : 'Update the details of this appointment.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-4 pb-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="edit-appt-title">Title</Label>
            <Input
              id="edit-appt-title"
              className={inputClass}
              aria-invalid={!!errors.title}
              {...register('title')}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-appt-doctor">Doctor name</Label>
            <Input id="edit-appt-doctor" className={inputClass} {...register('doctorName')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-appt-specialty">Specialty</Label>
            <Input id="edit-appt-specialty" className={inputClass} {...register('specialty')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-appt-starts">Starts</Label>
              <Controller
                control={control}
                name="startsAt"
                render={({ field }) => (
                  <Input
                    id="edit-appt-starts"
                    type="datetime-local"
                    className={inputClass}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={toLocalInputValue(field.value instanceof Date ? field.value : undefined)}
                    onChange={(e) => field.onChange(fromLocalInputValue(e.target.value))}
                    aria-invalid={!!errors.startsAt}
                  />
                )}
              />
              {errors.startsAt && (
                <p className="text-sm text-destructive">{errors.startsAt.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-appt-ends">Ends</Label>
              <Controller
                control={control}
                name="endsAt"
                render={({ field }) => (
                  <Input
                    id="edit-appt-ends"
                    type="datetime-local"
                    className={inputClass}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={toLocalInputValue(field.value instanceof Date ? field.value : undefined)}
                    onChange={(e) => field.onChange(fromLocalInputValue(e.target.value))}
                    aria-invalid={!!errors.endsAt}
                  />
                )}
              />
              {errors.endsAt && <p className="text-sm text-destructive">{errors.endsAt.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-appt-location">Location</Label>
            <Input id="edit-appt-location" className={inputClass} {...register('location')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-appt-companion">Accompanied by</Label>
            <select
              id="edit-appt-companion"
              className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register('accompaniedBy')}
            >
              <option value="">No companion</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-appt-notes">Notes</Label>
            <Textarea id="edit-appt-notes" rows={3} {...register('notes')} />
          </div>

          <div className="flex min-h-11 items-center justify-between gap-4">
            <Label htmlFor="edit-appt-sensitivity">Mark as restricted</Label>
            <Controller
              control={control}
              name="sensitivity"
              render={({ field }) => (
                <Switch
                  id="edit-appt-sensitivity"
                  checked={field.value === 'restricted'}
                  onCheckedChange={(checked: boolean) => field.onChange(checked ? 'restricted' : 'normal')}
                />
              )}
            />
          </div>

          <SheetFooter className="px-0">
            <Button type="submit" className="min-h-11" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : reschedule ? 'Save new time' : 'Save changes'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
