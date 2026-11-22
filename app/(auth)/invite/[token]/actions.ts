'use server';

/**
 * Invitation acceptance action
 * Owner: Member A
 */

import { revalidatePath } from 'next/cache';
import { createAction } from '@/lib/utils/action';
import { bumpCircleVersion } from '@/lib/live/version';
import { acceptInvitation } from '@/lib/data/invitations';
import { invitationErrorMessage } from '@/lib/data/invitation-errors';
import { setLastCircleCookie } from '@/lib/data/circles';
import { acceptInvitationSchema } from '@/lib/schemas/invitations';

export const acceptInvitationAction = createAction(
  acceptInvitationSchema,
  async (data, { user }) => {
    if (!user) throw new Error('Please sign in again.');

    let circleId: string;
    try {
      circleId = await acceptInvitation({ userId: user.id, token: data.token });
    } catch (err) {
      throw new Error(invitationErrorMessage(err));
    }

    await bumpCircleVersion(circleId);
    await setLastCircleCookie(circleId);
    revalidatePath('/');
    return { circleId };
  },
  { auth: 'verified' },
);
