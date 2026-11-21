'use server';

/**
 * Meds & Refills actions
 * Owner: Member B
 */
import { revalidatePath } from 'next/cache';
import { createAction } from '@/lib/utils/action';
import { requireCircleRole } from '@/lib/data/circle-context';
import { createMedicationWithRefill, updateMedication } from '@/lib/data/medications';
import { markRefillOrdered, markRefillRefilled } from '@/lib/data/refills';
import { createMedicationSchema, updateMedicationSchema } from '@/lib/schemas/medications';
import { markRefillOrderedSchema, markRefillRefilledSchema } from '@/lib/schemas/refills';
import type { CircleRole } from '@/lib/types/app';

/** Roles allowed to create, edit and refill medicines (mirrors can('manage_records')). */
const MANAGE_ROLES: CircleRole[] = ['owner', 'coordinator', 'caregiver'];

function medsPath(circleId: string) {
  return `/c/${circleId}/meds`;
}

export const createMedicationAction = createAction(
  createMedicationSchema,
  async (data) => {
    const ctx = await requireCircleRole(data.circleId, MANAGE_ROLES);
    const medication = await createMedicationWithRefill(ctx, data);
    revalidatePath(medsPath(data.circleId));
    return { id: medication.id };
  },
  { auth: 'verified' },
);

export const updateMedicationAction = createAction(
  updateMedicationSchema,
  async (data) => {
    const ctx = await requireCircleRole(data.circleId, MANAGE_ROLES);
    const medication = await updateMedication(ctx, data.id, data);
    revalidatePath(medsPath(data.circleId));
    return { id: medication.id };
  },
  { auth: 'verified' },
);

export const markRefillOrderedAction = createAction(
  markRefillOrderedSchema,
  async (data) => {
    const ctx = await requireCircleRole(data.circleId, MANAGE_ROLES);
    const refill = await markRefillOrdered(ctx, data.refillId);
    revalidatePath(medsPath(data.circleId));
    return { id: refill.id };
  },
  { auth: 'verified' },
);

export const markRefillRefilledAction = createAction(
  markRefillRefilledSchema,
  async (data) => {
    const ctx = await requireCircleRole(data.circleId, MANAGE_ROLES);
    const refill = await markRefillRefilled(ctx, data);
    revalidatePath(medsPath(data.circleId));
    return { id: refill.id };
  },
  { auth: 'verified' },
);
