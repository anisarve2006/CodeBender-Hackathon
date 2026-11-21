'use server';

/**
 * Appointments actions
 * Owner: Member B
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAction } from '@/lib/utils/action';
import { requireCircleRole } from '@/lib/data/circle-context';
import {
  createAppointment,
  updateAppointment,
  resolveAppointment,
  getCircleMemberOptions,
} from '@/lib/data/appointments';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  resolveAppointmentActionSchema,
} from '@/lib/schemas/appointments';
import type { CircleRole } from '@/lib/types/app';

/** Roles allowed to create, edit and resolve appointments (mirrors can('manage_records')). */
const MANAGE_ROLES: CircleRole[] = ['owner', 'coordinator', 'caregiver'];

function appointmentsPath(circleId: string) {
  return `/c/${circleId}/appointments`;
}

export const createAppointmentAction = createAction(
  createAppointmentSchema,
  async (data) => {
    const ctx = await requireCircleRole(data.circleId, MANAGE_ROLES);
    const appointment = await createAppointment(ctx, data);
    revalidatePath(appointmentsPath(data.circleId));
    return { id: appointment.id };
  },
  { auth: 'verified' },
);

export const updateAppointmentAction = createAction(
  updateAppointmentSchema,
  async (data) => {
    const circleId = data.circleId;
    if (!circleId) throw new Error('Circle is required.');
    const ctx = await requireCircleRole(circleId, MANAGE_ROLES);
    const appointment = await updateAppointment(ctx, data.id, data);
    revalidatePath(appointmentsPath(circleId));
    return { id: appointment.id };
  },
  { auth: 'verified' },
);

/** Lets the quick-add dialog load the companion picker without the layout passing members down. */
export const listCircleMembersAction = createAction(
  z.object({ circleId: z.string().uuid() }),
  async (data) => {
    await requireCircleRole(data.circleId, MANAGE_ROLES);
    return getCircleMemberOptions(data.circleId);
  },
  { auth: 'verified' },
);

export const resolveAppointmentAction = createAction(
  resolveAppointmentActionSchema,
  async (data) => {
    const ctx = await requireCircleRole(data.circleId, MANAGE_ROLES);
    const appointment = await resolveAppointment(ctx, data.id, data.outcome, data.notes);
    revalidatePath(appointmentsPath(data.circleId));
    return { id: appointment.id };
  },
  { auth: 'verified' },
);
