'use server';

/**
 * Appointments Server Actions
 * Owner: Member B
 * Role-gated via requireCircleRole → withUserTx → bumpCircleVersion → revalidatePath.
 */

import { revalidatePath } from 'next/cache';
import { createAction } from '@/lib/utils/action';
import { requireCircleRole } from '@/lib/data/circle-context';
import { bumpCircleVersion } from '@/lib/live/version';
import { listCircleMembers } from '@/lib/data/members';
import {
  createAppointment,
  deleteAppointment,
  recordAppointmentOutcome,
  updateAppointment,
} from '@/lib/data/appointments';
import {
  appointmentOutcomeSchema,
  appointmentRefSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
} from '@/lib/schemas/appointments';
import { circleIdSchema } from '@/lib/schemas/tasks';
import type { CircleRole } from '@/lib/types/app';

const MANAGE_ROLES: CircleRole[] = ['owner', 'coordinator', 'caregiver'];

function refreshAppointmentViews(circleId: string) {
  revalidatePath(`/c/${circleId}/appointments`);
  revalidatePath(`/c/${circleId}/timeline`);
  revalidatePath(`/c/${circleId}`);
}

/** Form options for companion pickers in modal dialogs. */
export const getAppointmentFormOptionsAction = createAction(
  circleIdSchema,
  async ({ circleId }) => {
    const ctx = await requireCircleRole(circleId);
    const rawMembers = await listCircleMembers(circleId, ctx.userId);
    const members = rawMembers.map((m) => ({
      userId: m.userId,
      fullName: m.fullName,
    }));
    return { members, role: ctx.role, userId: ctx.userId };
  },
);

export const createAppointmentAction = createAction(
  createAppointmentSchema,
  async (data, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(data.circleId, MANAGE_ROLES);

    const appointmentId = await createAppointment(ctx, data);

    await bumpCircleVersion(ctx.circleId);
    refreshAppointmentViews(ctx.circleId);
    return { appointmentId };
  },
  { auth: 'verified' },
);

export const updateAppointmentAction = createAction(
  updateAppointmentSchema,
  async (data, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(data.circleId, MANAGE_ROLES);

    await updateAppointment(ctx, data);

    await bumpCircleVersion(ctx.circleId);
    refreshAppointmentViews(ctx.circleId);
    return { appointmentId: data.appointmentId };
  },
  { auth: 'verified' },
);

export const recordAppointmentOutcomeAction = createAction(
  appointmentOutcomeSchema,
  async (data, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(data.circleId, MANAGE_ROLES);

    await recordAppointmentOutcome(ctx, data);

    await bumpCircleVersion(ctx.circleId);
    refreshAppointmentViews(ctx.circleId);
    return { appointmentId: data.appointmentId };
  },
  { auth: 'verified' },
);

export const deleteAppointmentAction = createAction(
  appointmentRefSchema,
  async ({ circleId, appointmentId }, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(circleId, MANAGE_ROLES);

    await deleteAppointment(ctx, appointmentId);

    await bumpCircleVersion(ctx.circleId);
    refreshAppointmentViews(ctx.circleId);
    return { appointmentId };
  },
  { auth: 'verified' },
);
