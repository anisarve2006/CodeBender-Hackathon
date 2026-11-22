import 'server-only';
import { withUserTx } from '@/db/client';
import { sql } from 'drizzle-orm';
import type { CircleContext, CircleRole } from '@/lib/types/app';

/* =========================================================================
   1. Who Did What (Accountability)
   ========================================================================= */

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

/* =========================================================================
   2. Circle Status Board (10-second overview via circle_dashboard())
   ========================================================================= */

export interface DashboardOverdueTask {
  id: string;
  title: string;
  category: string;
  priority: string;
  due_at: string;
  assigned_to: string | null;
  assignee_name?: string | null;
}

export interface DashboardNextAppointment {
  id: string;
  title: string;
  doctor_name: string | null;
  specialty: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
}

export interface DashboardRefillDue {
  id: string;
  medication_name: string;
  quantity_on_hand: number;
  daily_usage: number;
  next_refill_due: string | null;
  status: 'ok' | 'due_soon' | 'overdue' | 'ordered';
}

export interface DashboardPendingMember {
  user_id: string;
  full_name: string;
  pending_count: number;
}

export interface DashboardRecentActivity {
  id: number;
  action: string;
  entity_type: string;
  summary: string;
  created_at: string;
  actor_name?: string | null;
}

export interface DashboardLatestUpdate {
  id: string;
  body: string;
  mood_tag: string | null;
  author_name: string;
  created_at: string;
}

export interface CircleDashboardData {
  status: 'green' | 'amber' | 'red';
  status_reason: string;
  overdue_tasks: DashboardOverdueTask[];
  next_appointments: DashboardNextAppointment[];
  refills_due: DashboardRefillDue[];
  pending_by_member: DashboardPendingMember[];
  recent_activity: DashboardRecentActivity[];
  latest_update: DashboardLatestUpdate | null;
}

/**
 * Fetches the 10-second circle status board overview
 * using the frozen circle_dashboard(p_circle) SQL contract.
 */
export async function getCircleDashboard(ctx: CircleContext): Promise<CircleDashboardData> {
  return withUserTx(ctx.userId, async (tx) => {
    const res = await tx.execute<{ dashboard: CircleDashboardData }>(sql`
      SELECT circle_dashboard(${ctx.circleId}::uuid) AS dashboard
    `);

    const raw = res.rows[0]?.dashboard;
    if (!raw) {
      return {
        status: 'green',
        status_reason: 'All care items are on schedule.',
        overdue_tasks: [],
        next_appointments: [],
        refills_due: [],
        pending_by_member: [],
        recent_activity: [],
        latest_update: null,
      };
    }

    return {
      status: raw.status || 'green',
      status_reason: raw.status_reason || 'All care items are on schedule.',
      overdue_tasks: Array.isArray(raw.overdue_tasks) ? raw.overdue_tasks : [],
      next_appointments: Array.isArray(raw.next_appointments) ? raw.next_appointments : [],
      refills_due: Array.isArray(raw.refills_due) ? raw.refills_due : [],
      pending_by_member: Array.isArray(raw.pending_by_member) ? raw.pending_by_member : [],
      recent_activity: Array.isArray(raw.recent_activity) ? raw.recent_activity : [],
      latest_update: raw.latest_update || null,
    };
  });
}
