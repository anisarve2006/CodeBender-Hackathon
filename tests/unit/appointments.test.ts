import { describe, it, expect } from 'vitest';
import {
  createAppointmentSchema,
  appointmentOutcomeSchema,
  defaultAppointmentTimes,
  localToIso,
} from '@/lib/schemas/appointments';

describe('Appointments Zod Schemas & Helpers', () => {
  const circleId = 'a0000000-0000-4000-8000-000000000001';

  it('validates a correct appointment input', () => {
    const startsAt = new Date('2026-12-01T10:00:00.000Z');
    const endsAt = new Date('2026-12-01T11:00:00.000Z');

    const result = createAppointmentSchema.safeParse({
      circleId,
      title: 'Cardiologist Checkup',
      doctorName: 'Dr. S. Mehta',
      specialty: 'Cardiology',
      location: 'Apollo Clinic, Koramangala',
      startsAt,
      endsAt,
      sensitivity: 'normal',
      createPrepTask: true,
      createAccompanyTask: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Cardiologist Checkup');
      expect(result.data.sensitivity).toBe('normal');
      expect(result.data.createPrepTask).toBe(true);
    }
  });

  it('rejects an appointment when end time is before or equal to start time', () => {
    const startsAt = new Date('2026-12-01T11:00:00.000Z');
    const endsAt = new Date('2026-12-01T10:00:00.000Z');

    const result = createAppointmentSchema.safeParse({
      circleId,
      title: 'Invalid Timing',
      startsAt,
      endsAt,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes('End time must be after start time')),
      ).toBe(true);
    }
  });

  it('rejects an appointment with an empty or whitespace title', () => {
    const startsAt = new Date('2026-12-01T10:00:00.000Z');
    const endsAt = new Date('2026-12-01T11:00:00.000Z');

    const result = createAppointmentSchema.safeParse({
      circleId,
      title: '   ',
      startsAt,
      endsAt,
    });

    expect(result.success).toBe(false);
  });

  it('validates appointment outcome recording', () => {
    const apptId = 'a0000000-0000-4000-8000-000000000002';

    const completed = appointmentOutcomeSchema.safeParse({
      circleId,
      appointmentId: apptId,
      status: 'completed',
      notes: 'Doctor adjusted dosage.',
    });
    expect(completed.success).toBe(true);

    const rescheduledValid = appointmentOutcomeSchema.safeParse({
      circleId,
      appointmentId: apptId,
      status: 'rescheduled',
      rescheduleStartsAt: new Date('2026-12-05T10:00:00.000Z'),
      rescheduleEndsAt: new Date('2026-12-05T11:00:00.000Z'),
      notes: 'Doctor was on emergency call.',
    });
    expect(rescheduledValid.success).toBe(true);

    const rescheduledInvalid = appointmentOutcomeSchema.safeParse({
      circleId,
      appointmentId: apptId,
      status: 'rescheduled',
      rescheduleStartsAt: new Date('2026-12-05T11:00:00.000Z'),
      rescheduleEndsAt: new Date('2026-12-05T10:00:00.000Z'),
    });
    expect(rescheduledInvalid.success).toBe(false);
  });

  it('generates consistent local time offsets', () => {
    const times = defaultAppointmentTimes(new Date('2026-11-21T12:00:00.000Z'));
    expect(times.startsLocal).toMatch(/^\d{4}-\d{2}-\d{2}T10:00$/);
    expect(times.endsLocal).toMatch(/^\d{4}-\d{2}-\d{2}T11:00$/);

    const iso = localToIso('2026-12-01T10:00');
    expect(new Date(iso).toISOString()).toBe('2026-12-01T04:30:00.000Z');
  });
});
