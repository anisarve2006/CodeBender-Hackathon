import { z } from 'zod';
import type { CircleRole } from '@/lib/types/app';

/**
 * lib/schemas/members.ts
 * Owner: Member A
 * Member, invitation and circle-settings schemas plus the pure role rules.
 * No database imports, so this module is unit tested directly.
 */

/** Roles an owner may assign from the settings table. care_recipient is not assignable here. */
export const ASSIGNABLE_ROLES = ['owner', 'coordinator', 'caregiver', 'viewer'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ASSIGNABLE_ROLE_LABELS: Record<AssignableRole, string> = {
  owner: 'Owner',
  coordinator: 'Coordinator',
  caregiver: 'Caregiver',
  viewer: 'Viewer',
};

export const changeRoleSchema = z.object({
  circleId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(ASSIGNABLE_ROLES, { message: 'Choose a valid role.' }),
});

export const removeMemberSchema = z.object({
  circleId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const invitationRefSchema = z.object({
  circleId: z.string().uuid(),
  invitationId: z.string().uuid(),
});

export const circleNameSchema = z.object({
  circleId: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(3, 'Give the circle a name of at least 3 characters.')
    .max(60, 'Keep the circle name to 60 characters or fewer.'),
});

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;
export type CircleNameInput = z.infer<typeof circleNameSchema>;

/**
 * Who may change a member's role. Only owners manage members, and the
 * "last owner" rule is enforced by the database trigger (see member-errors.ts).
 */
export function canManageMembers(actorRole: CircleRole | undefined): boolean {
  return actorRole === 'owner';
}

/** Who may remove a member. Owners only. */
export function canRemoveMembers(actorRole: CircleRole | undefined): boolean {
  return actorRole === 'owner';
}

/**
 * Returns an error message when a role change is not allowed before the
 * database is touched. Null means the change may proceed.
 */
export function roleChangeError(
  actorRole: CircleRole | undefined,
  actorId: string,
  targetId: string,
  newRole: AssignableRole,
): string | null {
  if (!canManageMembers(actorRole)) {
    return 'Only the circle owner can change roles.';
  }
  if (actorId === targetId && newRole !== 'owner') {
    return 'You cannot change your own role. Ask another owner to do it.';
  }
  return null;
}

/** Returns an error message when a member removal is not allowed before the database is touched. */
export function memberRemovalError(
  actorRole: CircleRole | undefined,
  actorId: string,
  targetId: string,
): string | null {
  if (!canRemoveMembers(actorRole)) {
    return 'Only the circle owner can remove members.';
  }
  if (actorId === targetId) {
    return 'You cannot remove yourself from the circle here.';
  }
  return null;
}
