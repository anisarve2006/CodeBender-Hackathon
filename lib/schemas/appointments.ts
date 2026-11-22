import { z } from 'zod';

/**
 * lib/schemas/appointments.ts
 * Owner: Member B
 * Zod schemas for doctor appointments and scheduling.
 */

export const APPOINTMENT_STATUSES = [
  'scheduled',
  'completed',
  'missed',
  'rescheduled',
  'cancelled',
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  missed: 'Missed',
  rescheduled: 'Rescheduled',
  cancelled: 'Cancelled',
};

const titleField = z
  .string()
  .trim()
  .min(2, 'Appointment title is required')
  .max(120, 'Keep the title to 120 characters or fewer.');

const doctorNameField = z
  .string()
  .trim()
  .max(100, 'Doctor name must be 100 characters or fewer.')
  .nullish();

const specialtyField = z
  .string()
  .trim()
  .max(100, 'Specialty must be 100 characters or fewer.')
  .nullish();

const locationField = z
  .string()
  .trim()
  .max(250, 'Location must be 250 characters or fewer.')
  .nullish();

const notesField = z
  .string()
  .trim()
  .max(1000, 'Notes must be 1000 characters or fewer.')
  .nullish();

export const createAppointmentSchema = z
  .object({
    circleId: z.string().uuid(),
    title: titleField,
    doctorName: doctorNameField,
    specialty: specialtyField,
    location: locationField,
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    accompaniedBy: z.string().uuid().nullish(),
    notes: notesField,
    sensitivity: z.enum(['normal', 'restricted']).default('normal'),
    createPrepTask: z.boolean().default(true),
    createAccompanyTask: z.boolean().default(true),
  })
  .refine((data) => data.endsAt.getTime() > data.startsAt.getTime(), {
    message: 'End time must be after start time.',
    path: ['endsAt'],
  });

export const updateAppointmentSchema = z
  .object({
    circleId: z.string().uuid(),
    appointmentId: z.string().uuid(),
    title: titleField,
    doctorName: doctorNameField,
    specialty: specialtyField,
    location: locationField,
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    accompaniedBy: z.string().uuid().nullish(),
    notes: notesField,
    sensitivity: z.enum(['normal', 'restricted']).default('normal'),
    status: z.enum(APPOINTMENT_STATUSES).optional(),
  })
  .refine((data) => data.endsAt.getTime() > data.startsAt.getTime(), {
    message: 'End time must be after start time.',
    path: ['endsAt'],
  });

export const appointmentOutcomeSchema = z
  .object({
    circleId: z.string().uuid(),
    appointmentId: z.string().uuid(),
    status: z.enum(['completed', 'missed', 'rescheduled']),
    notes: notesField,
    rescheduleStartsAt: z.coerce.date().nullish(),
    rescheduleEndsAt: z.coerce.date().nullish(),
  })
  .refine(
    (data) => {
      if (data.status === 'rescheduled') {
        if (!data.rescheduleStartsAt || !data.rescheduleEndsAt) return false;
        return data.rescheduleEndsAt.getTime() > data.rescheduleStartsAt.getTime();
      }
      return true;
    },
    {
      message: 'Rescheduled end time must be after the rescheduled start time.',
      path: ['rescheduleEndsAt'],
    },
  );

export const appointmentRefSchema = z.object({
  circleId: z.string().uuid(),
  appointmentId: z.string().uuid(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type AppointmentOutcomeInput = z.infer<typeof appointmentOutcomeSchema>;

/** Form input helpers for datetime-local strings in Asia/Kolkata (UTC+05:30) */
const IST_OFFSET_MS = 330 * 60 * 1000;

export function defaultAppointmentTimes(now: Date = new Date()) {
  const tomorrow = new Date(now.getTime() + IST_OFFSET_MS + 24 * 60 * 60 * 1000);
  const dateStr = tomorrow.toISOString().slice(0, 10);
  return {
    startsLocal: `${dateStr}T10:00`,
    endsLocal: `${dateStr}T11:00`,
  };
}

export function localToIso(local: string): string {
  return new Date(`${local}:00+05:30`).toISOString();
}

export function isoToLocal(isoString: string | Date): string {
  const date = typeof isoString === 'string' ? new Date(isoString) : isoString;
  const istShifted = new Date(date.getTime() + IST_OFFSET_MS);
  return istShifted.toISOString().slice(0, 16);
}

/** Pure object schemas for client form validation with react-hook-form */
export const quickAddFormSchema = z.object({
  title: titleField,
  doctorName: z.string().trim().max(100).optional(),
  specialty: z.string().trim().max(100).optional(),
  location: z.string().trim().max(250).optional(),
  startsLocal: z.string().min(1, 'Pick a start date and time'),
  endsLocal: z.string().min(1, 'Pick an end date and time'),
  accompaniedBy: z.string().optional(),
  notes: z.string().trim().max(1000).optional(),
  sensitivity: z.enum(['normal', 'restricted']),
  createPrepTask: z.boolean(),
  createAccompanyTask: z.boolean(),
});

export type QuickAddFormValues = z.infer<typeof quickAddFormSchema>;

export const editFormSchema = z.object({
  title: titleField,
  doctorName: z.string().trim().max(100).optional(),
  specialty: z.string().trim().max(100).optional(),
  location: z.string().trim().max(250).optional(),
  startsLocal: z.string().min(1, 'Pick a start date and time'),
  endsLocal: z.string().min(1, 'Pick an end date and time'),
  accompaniedBy: z.string().optional(),
  notes: z.string().trim().max(1000).optional(),
  sensitivity: z.enum(['normal', 'restricted']),
  status: z.enum(APPOINTMENT_STATUSES),
});

export type EditFormValues = z.infer<typeof editFormSchema>;

export const outcomeFormSchema = z.object({
  status: z.enum(['completed', 'missed', 'rescheduled']),
  notes: z.string().trim().max(1000).optional(),
  rescheduleStartsLocal: z.string().optional(),
  rescheduleEndsLocal: z.string().optional(),
});

export type OutcomeFormValues = z.infer<typeof outcomeFormSchema>;
