import 'server-only';
import { sql } from 'drizzle-orm';
import { withUserTx } from '@/db/client';
import type { CircleContext, CircleRole } from '@/lib/types/app';

/**
 * lib/data/dashboard.ts
 * Owner: Member A
 * Who did what, backed by the who_did_what() SQL contract (SECURITY INVOKER, so RLS applies).
 * Windows are built by dashboard-window.ts (Asia/Kolkata day boundaries).
 */

export type MemberAccountability = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: CircleRole;
  completed: number;
  open: number;
  overdue: number;
};

type WhoDidWhatRow = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: CircleRole;
  completed_count: string | number;
  open_count: string | number;
  overdue_count: string | number;
};

/** Per-member completed, open and overdue task counts for the window [from, to]. */
export async function whoDidWhat(
  ctx: CircleContext,
  from: Date,
  to: Date,
): Promise<MemberAccountability[]> {
  return withUserTx(ctx.userId, async (tx) => {
    const result = await tx.execute<WhoDidWhatRow>(
      sql`select * from who_did_what(${ctx.circleId}::uuid, ${from.toISOString()}::timestamptz, ${to.toISOString()}::timestamptz)`,
    );

    return result.rows
      .map((row) => ({
        userId: row.user_id,
        fullName: row.full_name,
        avatarUrl: row.avatar_url,
        role: row.role,
        completed: Number(row.completed_count),
        open: Number(row.open_count),
        overdue: Number(row.overdue_count),
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  });
}
