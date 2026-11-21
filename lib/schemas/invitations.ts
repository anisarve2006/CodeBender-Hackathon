import { z } from 'zod';

/**
 * lib/schemas/invitations.ts
 * Owner: Member A
 * Invitation schemas. Owners are never invited through the wizard; the
 * database also rejects it, so the UI offers only the roles below.
 */

export const createInvitationSchema = z.object({
  circleId: z.string().uuid(),
  email: z.string().email('Please enter a valid email address').toLowerCase(),
  role: z.enum(['owner', 'coordinator', 'caregiver', 'viewer', 'care_recipient']),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(32, 'Invalid invitation token'),
});

export const INVITABLE_ROLES = ['coordinator', 'caregiver', 'viewer'] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const INVITABLE_ROLE_LABELS: Record<InvitableRole, string> = {
  coordinator: 'Coordinator: manages records, tasks and invitations',
  caregiver: 'Caregiver: day-to-day care and tasks',
  viewer: 'Viewer: read-only',
};

export const MAX_INVITE_ROWS = 10;

/** One invite row as the wizard stores it. Blank email means the row is ignored. */
export const inviteRowSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254, 'Keep the email address to 254 characters or fewer.')
    .refine((value) => value === '' || z.email().safeParse(value).success, {
      message: 'Please enter a valid email address, or leave the row empty.',
    }),
  role: z.enum(INVITABLE_ROLES, { message: 'Choose a role for this person.' }),
});

export const inviteFormSchema = z.object({
  invites: z
    .array(inviteRowSchema)
    .max(MAX_INVITE_ROWS, `You can invite up to ${MAX_INVITE_ROWS} people at a time.`),
});

export type InviteFormInput = z.infer<typeof inviteFormSchema>;

/** Drops blank rows and normalises emails before they reach the server. */
export function cleanInviteRows(
  rows: { email: string; role: InvitableRole }[],
): { email: string; role: InvitableRole }[] {
  return rows
    .map((row) => ({ email: row.email.trim().toLowerCase(), role: row.role }))
    .filter((row) => row.email !== '');
}

/** Server-side input for sending invitations (blank rows already removed). */
export const sendInvitesSchema = z.object({
  circleId: z.string().uuid('Something went wrong. Please start setup again.'),
  invites: z
    .array(
      z.object({
        email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
        role: z.enum(INVITABLE_ROLES),
      }),
    )
    .max(MAX_INVITE_ROWS),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type SendInvitesInput = z.infer<typeof sendInvitesSchema>;

