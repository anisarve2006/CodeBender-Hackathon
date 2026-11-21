'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { z } from 'zod';
import { CalendarPlus } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { createAppointmentSchema } from '@/lib/schemas/appointments';
import {
  createAppointmentAction,
  listCircleMembersAction,
} from '@/app/(app)/c/[circleId]/appointments/actions';
import {
  emptyToUndefined,
  fromLocalInputValue,
  toLocalInputValue,
} from '@/components/features/appointments/form-utils';

type AppointmentFormValues = z.input<typeof createAppointmentSchema>;

export interface AppointmentMemberOption {
  id: string;
  fullName: string;
}

interface QuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  circleId: string;
  members?: AppointmentMemberOption[];
}

const inputClass = 'min-h-11';

export function QuickAddAppointmentDialog({
  open,
  onOpenChange,
  circleId,
  members = [],
}: QuickAddDialogProps) {
  const router = useRouter();
  const [loadedMembers, setLoadedMembers] = React.useState<AppointmentMemberOption[]>([]);

  // The global quick-add button does not pass members, so load the picker list when the dialog opens.
  React.useEffect(() => {
    if (!open || members.length > 0) return;
    let cancelled = false;
    listCircleMembersAction({ circleId }).then((result) => {
      if (!cancelled && result.ok) {
        setLoadedMembers(result.data);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, circleId, members.length]);

  const memberOptions = members.length > 0 ? members : loadedMembers;

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      circleId,
      title: '',
      sensitivity: 'normal',
      createDocTask: true,
      createAccompanyTask: true,
    },
  });
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = async (values: AppointmentFormValues) => {
    const result = await createAppointmentAction({
      ...values,
      circleId,
      doctorName: emptyToUndefined(values.doctorName),
      specialty: emptyToUndefined(values.specialty),
      location: emptyToUndefined(values.location),
      notes: emptyToUndefined(values.notes),
      accompaniedBy: emptyToUndefined(values.accompaniedBy),
    });

    if (result.ok) {
      toast.success('Appointment scheduled');
      reset({ circleId, title: '', sensitivity: 'normal', createDocTask: true, createAccompanyTask: true });
      onOpenChange(false);
      router.refresh();
      return;
    }

    if (result.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (messages[0]) {
          setError(field as keyof AppointmentFormValues, { message: messages[0] });
        }
      }
    }
    toast.error(result.error);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Doctor Appointment</DialogTitle>
          <DialogDescription>Schedule consultation or clinical follow-up.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="appt-title">Title *</Label>
            <Input
              id="appt-title"
              className={inputClass}
              aria-invalid={!!errors.title}
              {...register('title')}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="appt-doctor">Doctor name</Label>
            <Input id="appt-doctor" className={inputClass} {...register('doctorName')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="appt-specialty">Specialty</Label>
            <Input id="appt-specialty" className={inputClass} {...register('specialty')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="appt-starts">Starts *</Label>
              <Controller
                control={control}
                name="startsAt"
                render={({ field }) => (
                  <Input
                    id="appt-starts"
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
              <Label htmlFor="appt-ends">Ends *</Label>
              <Controller
                control={control}
                name="endsAt"
                render={({ field }) => (
                  <Input
                    id="appt-ends"
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
            <Label htmlFor="appt-location">Location</Label>
            <Input id="appt-location" className={inputClass} {...register('location')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="appt-companion">Accompanied by</Label>
            <select
              id="appt-companion"
              className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register('accompaniedBy')}
            >
              <option value="">No companion</option>
              {memberOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="appt-notes">Notes</Label>
            <Textarea id="appt-notes" rows={3} {...register('notes')} />
          </div>

          <div className="flex min-h-11 items-center justify-between gap-4">
            <Label htmlFor="appt-sensitivity">Mark as restricted</Label>
            <Controller
              control={control}
              name="sensitivity"
              render={({ field }) => (
                <Switch
                  id="appt-sensitivity"
                  checked={field.value === 'restricted'}
                  onCheckedChange={(checked: boolean) => field.onChange(checked ? 'restricted' : 'normal')}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" className="h-5 w-5" {...register('createDocTask')} />
              Create task: prepare documents
            </label>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" className="h-5 w-5" {...register('createAccompanyTask')} />
              Create task: accompany
            </label>
          </div>

          <DialogFooter>
            <Button type="submit" className="min-h-11" disabled={isSubmitting}>
              <CalendarPlus className="h-4 w-4" />
              {isSubmitting ? 'Saving…' : 'Schedule appointment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Trigger button plus dialog, for use in server-rendered pages. */
export function QuickAddAppointmentButton({
  circleId,
  members,
}: {
  circleId: string;
  members: AppointmentMemberOption[];
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button className="min-h-11" onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" />
        Schedule appointment
      </Button>
      <QuickAddAppointmentDialog
        open={open}
        onOpenChange={setOpen}
        circleId={circleId}
        members={members}
      />
    </>
  );
}
