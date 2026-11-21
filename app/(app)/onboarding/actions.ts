'use server';

/**
 * Onboarding actions (wizard steps 1-3)
 * Owner: Member A
 * Every mutation goes through withUserTx, then bumpCircleVersion and revalidatePath.
 */

import { revalidatePath } from 'next/cache';
import { withUserTx } from '@/db/client';
import * as schema from '@/db/schema';
import { createAction } from '@/lib/utils/action';
import { requireCircleRole } from '@/lib/data/circle-context';
import { bumpCircleVersion } from '@/lib/live/version';
import { inviteLimiter } from '@/lib/utils/rate-limit';
import { sendEmail } from '@/lib/notifications/email';
import { clientEnv } from '@/lib/env';
import { createInvitations } from '@/lib/data/invitations';
import { invitationErrorMessage } from '@/lib/data/invitation-errors';
import { setLastCircleCookie } from '@/lib/data/circles';
import { circleNameStepSchema, recipientStepSchema, parseAllergies } from '@/lib/schemas/circles';
import { sendInvitesSchema } from '@/lib/schemas/invitations';

const SAVE_FAILED = 'We could not save your changes. Please try again.';

/** Never surface raw database text: log it and return a plain message. */
async function savingSafely<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error('Onboarding save failed:', err);
    throw new Error(SAVE_FAILED);
  }
}

/** Step 1: create the circle, consent timestamp, and owner membership. */
export const createCircleAction = createAction(
  circleNameStepSchema,
  async (data, { user }) => {
    if (!user) throw new Error('Please sign in again.');

    const circleId = await savingSafely(() =>
      withUserTx(user.id, async (tx) => {
        const [circle] = await tx
          .insert(schema.careCircles)
          .values({
            name: data.name,
            consentConfirmedAt: new Date(),
            consentConfirmedBy: user.id,
            createdBy: user.id,
          })
          .returning({ id: schema.careCircles.id });

        await tx.insert(schema.circleMembers).values({
          circleId: circle.id,
          userId: user.id,
          role: 'owner',
        });

        return circle.id;
      }),
    );

    await bumpCircleVersion(circleId);
    await setLastCircleCookie(circleId);
    revalidatePath('/');
    return { circleId };
  },
  { auth: 'verified' },
);

/** Step 2: create or update the care recipient profile, stored as entered. */
export const saveRecipientAction = createAction(
  recipientStepSchema,
  async (data, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    await requireCircleRole(data.circleId, ['owner', 'coordinator']);

    const emergencyContact = data.primaryContactName
      ? {
          name: data.primaryContactName,
          phone: data.primaryContactPhone,
          relationship: data.primaryContactRelationship,
        }
      : null;

    const fields = {
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth || null,
      bloodGroup: data.bloodGroup || null,
      allergies: parseAllergies(data.allergies),
      emergencyContact,
      updatedAt: new Date(),
    };

    await savingSafely(() =>
      withUserTx(user.id, async (tx) => {
        await tx
          .insert(schema.careRecipients)
          .values({ circleId: data.circleId, ...fields })
          .onConflictDoUpdate({
            target: schema.careRecipients.circleId,
            set: fields,
          });
      }),
    );

    await bumpCircleVersion(data.circleId);
    revalidatePath(`/c/${data.circleId}`);
    return { circleId: data.circleId };
  },
  { auth: 'verified' },
);

export type SentInvitation = {
  email: string;
  role: 'coordinator' | 'caregiver' | 'viewer';
  link: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Step 3: create invitations (rate-limited), then email each link. */
export const sendInvitesAction = createAction(
  sendInvitesSchema,
  async (data, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    await requireCircleRole(data.circleId, ['owner', 'coordinator']);

    if (data.invites.length === 0) {
      return { circleId: data.circleId, invitations: [] as SentInvitation[] };
    }

    const limits = await Promise.all(data.invites.map(() => inviteLimiter.limit(user.id)));
    if (limits.some((limit) => !limit.success)) {
      throw new Error('You have sent a lot of invitations recently. Please try again later.');
    }

    let issued: Awaited<ReturnType<typeof createInvitations>>;
    try {
      issued = await createInvitations({
        userId: user.id,
        circleId: data.circleId,
        invites: data.invites,
      });
    } catch (err) {
      throw new Error(invitationErrorMessage(err));
    }

    await bumpCircleVersion(data.circleId);
    revalidatePath(`/c/${data.circleId}/family`);

    const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
    const inviterName = user.fullName || 'A family member';
    const subject = `${inviterName} invited you to help coordinate care on Family Care Hub`;

    const invitations: SentInvitation[] = issued.map((item) => ({
      email: item.email,
      role: item.role as SentInvitation['role'],
      link: `${siteUrl}/invite/${item.token}`,
    }));

    await Promise.all(
      invitations.map((item) =>
        sendEmail({
          to: item.email,
          subject,
          text: `${inviterName} invited you to help coordinate care on Family Care Hub.\n\nOpen this link to join (it expires in 72 hours):\n${item.link}\n\nFamily Care Hub organises information only and does not provide medical advice. Always consult a doctor.`,
          html: `<p>${escapeHtml(inviterName)} invited you to help coordinate care on Family Care Hub.</p><p><a href="${escapeHtml(item.link)}">Open the invitation</a> (it expires in 72 hours).</p><p style="color:#666;font-size:12px">Family Care Hub organises information only and does not provide medical advice. Always consult a doctor.</p>`,
        }),
      ),
    );

    return { circleId: data.circleId, invitations };
  },
  { auth: 'verified' },
);
