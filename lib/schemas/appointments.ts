import { z } from 'zod';

const appointmentBaseSchema = z.object({
  circleId: z.string().uuid(),
  title: z.string().min(2, 'Appointment title is required').max(100),
  doctorName: z.string().max(80).optional(),
  specialty: z.string().max(80).optional(),
  location: z.string().max(200).optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  accompaniedBy: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
  sensitivity: z.enum(['normal', 'restricted']).default('normal'),
  createDocTask: z.boolean().default(true),
  createAccompanyTask: z.boolean().default(true),
});

export const createAppointmentSchema = appointmentBaseSchema.refine(
  (data) => data.endsAt > data.startsAt,
  {
    message: 'End time must be after start time',
    path: ['endsAt'],
  },
);

export const updateAppointmentSchema = appointmentBaseSchema
  .partial()
  .extend({
    id: z.string().uuid(),
    status: z.enum(['scheduled', 'completed', 'missed', 'rescheduled', 'cancelled']).optional(),
  })
  .refine(
    (data) =>
      data.startsAt === undefined ||
      data.endsAt === undefined ||
      data.endsAt > data.startsAt,
    {
      message: 'End time must be after start time',
      path: ['endsAt'],
    },
  );

export const resolveAppointmentSchema = z.object({
  outcome: z.enum(['completed', 'missed', 'rescheduled']),
  notes: z.string().max(2000).optional(),
});

/** Server action input for "How did it go?": the appointment id plus its circle. */
export const resolveAppointmentActionSchema = resolveAppointmentSchema.extend({
  circleId: z.string().uuid(),
  id: z.string().uuid(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type ResolveAppointmentInput = z.infer<typeof resolveAppointmentSchema>;
export type ResolveAppointmentActionInput = z.infer<typeof resolveAppointmentActionSchema>;
