import { z } from 'zod';

export const createAppointmentSchema = z
  .object({
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
  })
  .refine((data) => data.endsAt > data.startsAt, {
    message: 'End time must be after start time',
    path: ['endsAt'],
  });

export const updateAppointmentSchema = createAppointmentSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(['scheduled', 'completed', 'missed', 'rescheduled', 'cancelled']).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
