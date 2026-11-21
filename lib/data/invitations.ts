import 'server-only';
import { sql } from 'drizzle-orm';
import { withUserTx } from '@/db/client';
import type { InvitableRole } from '@/lib/schemas/invitations';

/**
 * lib/data/invitations.ts
 * Owner: Member A
 * Circle invitation handling. Both calls run inside withUserTx so RLS and
 * the SQL contracts (create_invitation, accept_invitation) apply.
 */

export type IssuedInvitation = {
  email: string;
  role: InvitableRole;
  token: string;
};

/**
 * Calls create_invitation once per row. The SQL function checks that the
 * caller is owner or coordinator, and returns the raw token (shown once).
 */
export async function createInvitations(params: {
  userId: string;
  circleId: string;
  invites: { email: string; role: InvitableRole }[];
}): Promise<IssuedInvitation[]> {
  const { userId, circleId, invites } = params;

  return withUserTx(userId, async (tx) => {
    const issued: IssuedInvitation[] = [];
    for (const invite of invites) {
      const result = await tx.execute<{ token: string | null }>(
        sql`select create_invitation(${circleId}::uuid, ${invite.email}, ${invite.role}::circle_role) as token`,
      );
      const token = result.rows[0]?.token;
      if (!token) {
        throw new Error('Invitation could not be created.');
      }
      issued.push({ email: invite.email, role: invite.role, token });
    }
    return issued;
  });
}

/**
 * Calls accept_invitation(token). Returns the circle the user joined.
 * Errors propagate to the caller, which maps them with invitationErrorMessage.
 */
export async function acceptInvitation(params: {
  userId: string;
  token: string;
}): Promise<string> {
  const { userId, token } = params;

  return withUserTx(userId, async (tx) => {
    const result = await tx.execute<{ circle_id: string | null }>(
      sql`select accept_invitation(${token}) as circle_id`,
    );
    const circleId = result.rows[0]?.circle_id;
    if (!circleId) {
      throw new Error('Invitation could not be accepted.');
    }
    return circleId;
  });
}
