'use server';

/**
 * Medications and Refills Server Actions
 * Owner: Member B
 * Role-gated via requireCircleRole → withUserTx → bumpCircleVersion → revalidatePath.
 */

import { revalidatePath } from 'next/cache';
import { createAction } from '@/lib/utils/action';
import { requireCircleRole } from '@/lib/data/circle-context';
import { bumpCircleVersion } from '@/lib/live/version';
import {
  createMedication,
  deleteMedication,
  markRefillCompleted,
  markRefillOrdered,
  updateMedication,
} from '@/lib/data/medications';
import {
  createMedicationSchema,
  markOrderedSchema,
  medicationRefSchema,
  recordRefillSchema,
  updateMedicationSchema,
} from '@/lib/schemas/medications';
import type { CircleRole } from '@/lib/types/app';

const MANAGE_ROLES: CircleRole[] = ['owner', 'coordinator', 'caregiver'];

function refreshMedsViews(circleId: string) {
  revalidatePath(`/c/${circleId}/meds`);
  revalidatePath(`/c/${circleId}/care-mode`);
  revalidatePath(`/c/${circleId}`);
}

export const createMedicationAction = createAction(
  createMedicationSchema,
  async (data, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(data.circleId, MANAGE_ROLES);

    const medicationId = await createMedication(ctx, data);

    await bumpCircleVersion(ctx.circleId);
    refreshMedsViews(ctx.circleId);
    return { medicationId };
  },
  { auth: 'verified' },
);

export const updateMedicationAction = createAction(
  updateMedicationSchema,
  async (data, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(data.circleId, MANAGE_ROLES);

    await updateMedication(ctx, data);

    await bumpCircleVersion(ctx.circleId);
    refreshMedsViews(ctx.circleId);
    return { medicationId: data.medicationId };
  },
  { auth: 'verified' },
);

export const markRefillOrderedAction = createAction(
  markOrderedSchema,
  async ({ circleId, refillId }, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(circleId, MANAGE_ROLES);

    await markRefillOrdered(ctx, refillId);

    await bumpCircleVersion(ctx.circleId);
    refreshMedsViews(ctx.circleId);
    return { refillId };
  },
  { auth: 'verified' },
);

export const recordRefillAction = createAction(
  recordRefillSchema,
  async ({ circleId, refillId, quantityAdded }, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(circleId, MANAGE_ROLES);

    await markRefillCompleted(ctx, refillId, quantityAdded);

    await bumpCircleVersion(ctx.circleId);
    refreshMedsViews(ctx.circleId);
    return { refillId };
  },
  { auth: 'verified' },
);

export const deleteMedicationAction = createAction(
  medicationRefSchema,
  async ({ circleId, medicationId }, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(circleId, MANAGE_ROLES);

    await deleteMedication(ctx, medicationId);

    await bumpCircleVersion(ctx.circleId);
    refreshMedsViews(ctx.circleId);
    return { medicationId };
  },
  { auth: 'verified' },
);
