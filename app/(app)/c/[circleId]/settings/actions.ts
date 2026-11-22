'use server';

/**
 * Settings actions
 * Owner: Member A
 * Every mutation: requireCircleRole (role gate) → data function → bumpCircleVersion
 * → revalidatePath. Role and member management are owner-only; owners and
 * coordinators manage invitations and the circle record.
 */

import { revalidatePath } from 'next/cache';
import { createAction } from '@/lib/utils/action';
import { requireCircleRole } from '@/lib/data/circle-context';
import { bumpCircleVersion } from '@/lib/live/version';
import { inviteLimiter } from '@/lib/utils/rate-limit';
import { sendEmail } from '@/lib/notifications/email';
import { clientEnv } from '@/lib/env';
import { changeMemberRole, removeMember } from '@/lib/data/members';
import { createInvitations, getInvitationForResend, revokeInvitation } from '@/lib/data/invitations';
import { invitationErrorMessage } from '@/lib/data/invitation-errors';
import { updateCircleName, upsertCareRecipient } from '@/lib/data/circles';
import { parseAllergies, recipientStepSchema } from '@/lib/schemas/circles';
import {
  changeRoleSchema,
  circleNameSchema,
  invitationRefSchema,
  memberRemovalError,
  removeMemberSchema,
  roleChangeError,
} from '@/lib/schemas/members';

const OWNER_ONLY = ['owner'] as const;
const INVITE_ROLES = ['owner', 'coordinator'] as const;
const CIRCLE_INFO_ROLES = ['owner', 'coordinator'] as const;

const SAVE_FAILED = 'We could not save your changes. Please try again.';

function refreshSettings(circleId: string) {
  revalidatePath(`/c/${circleId}/settings`);
  revalidatePath(`/c/${circleId}/family`);
  revalidatePath(`/c/${circleId}`);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ---------- Member management (owner only) ---------- */

export const changeRoleAction = createAction(
  changeRoleSchema,
  async ({ circleId, userId, role }, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(circleId, [...OWNER_ONLY]);

    const conflict = roleChangeError(ctx.role, ctx.userId, userId, role);
    if (conflict) throw new Error(conflict);

    await changeMemberRole(ctx, userId, role);

    await bumpCircleVersion(ctx.circleId);
    refreshSettings(ctx.circleId);
    return { userId };
  },
  { auth: 'verified' },
);

export const removeMemberAction = createAction(
  removeMemberSchema,
  async ({ circleId, userId }, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(circleId, [...OWNER_ONLY]);

    const conflict = memberRemovalError(ctx.role, ctx.userId, userId);
    if (conflict) throw new Error(conflict);

    await removeMember(ctx, userId);

    await bumpCircleVersion(ctx.circleId);
    refreshSettings(ctx.circleId);
    return { userId };
  },
  { auth: 'verified' },
);

/* ---------- Invitations (owner and coordinator) ---------- */

export const revokeInviteAction = createAction(
  invitationRefSchema,
  async ({ circleId, invitationId }, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(circleId, [...INVITE_ROLES]);

    await revokeInvitation(ctx.userId, ctx.circleId, invitationId);

    await bumpCircleVersion(ctx.circleId);
    refreshSettings(ctx.circleId);
    return { invitationId };
  },
  { auth: 'verified' },
);

/**
 * Re-sends an open invitation: a fresh token and email are created first, then the
 * old invitation is revoked so only the new link works.
 */
export const resendInviteAction = createAction(
  invitationRefSchema,
  async ({ circleId, invitationId }, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(circleId, [...INVITE_ROLES]);

    const existing = await getInvitationForResend(ctx.userId, ctx.circleId, invitationId);
    if (!existing) throw new Error('That invitation could not be found.');

    const limit = await inviteLimiter.limit(user.id);
    if (!limit.success) {
      throw new Error('You have sent a lot of invitations recently. Please try again later.');
    }

    let issued: Awaited<ReturnType<typeof createInvitations>>;
    try {
      issued = await createInvitations({
        userId: ctx.userId,
        circleId: ctx.circleId,
        invites: [existing],
      });
    } catch (err) {
      throw new Error(invitationErrorMessage(err));
    }

    await revokeInvitation(ctx.userId, ctx.circleId, invitationId);

    const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
    const inviterName = user.fullName || 'A family member';
    const link = `${siteUrl}/invite/${issued[0].token}`;

    await sendEmail({
      to: existing.email,
      subject: `${inviterName} invited you to help coordinate care on Kinly`,
      text: `${inviterName} invited you to help coordinate care on Kinly.\n\nOpen this link to join (it expires in 72 hours):\n${link}\n\nKinly organises information only and does not provide medical advice. Always consult a doctor.`,
      html: `<p>${escapeHtml(inviterName)} invited you to help coordinate care on Kinly.</p><p><a href="${escapeHtml(link)}">Open the invitation</a> (it expires in 72 hours).</p><p style="color:#666;font-size:12px">Kinly organises information only and does not provide medical advice. Always consult a doctor.</p>`,
    });

    await bumpCircleVersion(ctx.circleId);
    refreshSettings(ctx.circleId);
    return { email: existing.email };
  },
  { auth: 'verified' },
);

/* ---------- Circle record and care recipient (owner and coordinator) ---------- */

export const updateCircleInfoAction = createAction(
  circleNameSchema,
  async ({ circleId, name }, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(circleId, [...CIRCLE_INFO_ROLES]);

    try {
      await updateCircleName(ctx.userId, ctx.circleId, name);
    } catch (err) {
      console.error('Circle rename failed:', err);
      throw new Error(SAVE_FAILED);
    }

    await bumpCircleVersion(ctx.circleId);
    refreshSettings(ctx.circleId);
    return { circleId: ctx.circleId };
  },
  { auth: 'verified' },
);

/** Saves the care recipient profile exactly as entered (no interpretation of medical fields). */
export const updateRecipientAction = createAction(
  recipientStepSchema,
  async (data, { user }) => {
    if (!user) throw new Error('Please sign in again.');
    const ctx = await requireCircleRole(data.circleId, [...CIRCLE_INFO_ROLES]);

    const emergencyContact = data.primaryContactName
      ? {
          name: data.primaryContactName,
          phone: data.primaryContactPhone,
          relationship: data.primaryContactRelationship,
        }
      : null;

    try {
      await upsertCareRecipient(ctx.userId, ctx.circleId, {
        fullName: data.fullName,
        dateOfBirth: data.dateOfBirth || null,
        bloodGroup: data.bloodGroup || null,
        allergies: parseAllergies(data.allergies),
        emergencyContact,
      });
    } catch (err) {
      console.error('Recipient save failed:', err);
      throw new Error(SAVE_FAILED);
    }

    await bumpCircleVersion(ctx.circleId);
    refreshSettings(ctx.circleId);
    return { circleId: ctx.circleId };
  },
  { auth: 'verified' },
);
