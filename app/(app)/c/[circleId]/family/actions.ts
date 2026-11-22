'use server';

/**
 * Family actions
 * Owner: Member A
 * Every mutation: requireCircleRole (role gate) → data function (withUserTx)
 * → bumpCircleVersion → revalidatePath.
 */

import { revalidatePath } from 'next/cache';
import { createAction } from '@/lib/utils/action';
import { can } from '@/lib/utils/rbac';
import { requireCircleRole } from '@/lib/data/circle-context';
import { bumpCircleVersion } from '@/lib/live/version';
import { createUpdate } from '@/lib/data/updates';
import { createUpdateSchema } from '@/lib/schemas/updates';
import type { CircleRole } from '@/lib/types/app';

const ALL_ROLES: CircleRole[] = ['owner', 'coordinator', 'caregiver', 'viewer', 'care_recipient'];

/** Roles that may post an update: the same capability that gates record editing. Viewers are blocked. */
const POST_ROLES: CircleRole[] = ALL_ROLES.filter((role) => can(role, 'manage_records'));

function refreshFamily(circleId: string) {
  revalidatePath(`/c/${circleId}/family`);
  revalidatePath(`/c/${circleId}`);
}

export const createUpdateAction = createAction(
  createUpdateSchema,
  async (data, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(data.circleId, POST_ROLES);

    const updateId = await createUpdate(ctx, { body: data.body, mood: data.mood });

    await bumpCircleVersion(ctx.circleId);
    refreshFamily(ctx.circleId);
    return { updateId };
  },
  { auth: 'verified' },
);
