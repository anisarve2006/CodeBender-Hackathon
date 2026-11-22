import 'server-only';
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { withUserTx } from '@/db/client';
import * as schema from '@/db/schema';
import { INVITABLE_ROLES, type InvitableRole } from '@/lib/schemas/invitations';

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

export type PendingInvitation = {
  id: string;
  email: string;
  role: InvitableRole;
  expiresAt: Date;
  createdAt: Date;
};

/** Invitations that are still open (not accepted, not expired), newest first. Owners and coordinators only (RLS). */
export async function listPendingInvitations(
  userId: string,
  circleId: string,
): Promise<PendingInvitation[]> {
  const rows = await withUserTx(userId, (tx) =>
    tx
      .select({
        id: schema.invitations.id,
        email: schema.invitations.email,
        role: schema.invitations.role,
        expiresAt: schema.invitations.expiresAt,
        createdAt: schema.invitations.createdAt,
      })
      .from(schema.invitations)
      .where(
        and(
          eq(schema.invitations.circleId, circleId),
          isNull(schema.invitations.acceptedAt),
          gt(schema.invitations.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(schema.invitations.createdAt)),
  );

  return rows.filter((row): row is PendingInvitation =>
    (INVITABLE_ROLES as readonly string[]).includes(row.role),
  );
}

/** Reads one invitation (email and role) so it can be re-sent. */
export async function getInvitationForResend(
  userId: string,
  circleId: string,
  invitationId: string,
): Promise<{ email: string; role: InvitableRole } | null> {
  return withUserTx(userId, async (tx) => {
    const [row] = await tx
      .select({ email: schema.invitations.email, role: schema.invitations.role })
      .from(schema.invitations)
      .where(
        and(
          eq(schema.invitations.id, invitationId),
          eq(schema.invitations.circleId, circleId),
          isNull(schema.invitations.acceptedAt),
        ),
      )
      .limit(1);
    if (!row || !(INVITABLE_ROLES as readonly string[]).includes(row.role)) return null;
    return { email: row.email, role: row.role as InvitableRole };
  });
}

/** Deletes an open invitation so its link stops working. RLS limits this to owners and coordinators. */
export async function revokeInvitation(
  userId: string,
  circleId: string,
  invitationId: string,
): Promise<void> {
  const deleted = await withUserTx(userId, (tx) =>
    tx
      .delete(schema.invitations)
      .where(
        and(
          eq(schema.invitations.id, invitationId),
          eq(schema.invitations.circleId, circleId),
          isNull(schema.invitations.acceptedAt),
        ),
      )
      .returning({ id: schema.invitations.id }),
  );
  if (deleted.length === 0) {
    throw new Error('That invitation could not be found.');
  }
}
