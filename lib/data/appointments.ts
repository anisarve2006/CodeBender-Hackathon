import 'server-only';
import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { withUserTx } from '@/db/client';
import * as schema from '@/db/schema';
import type { CircleContext } from '@/lib/types/app';
import { createTaskCore } from '@/lib/data/tasks-core';
import { enqueueNotification } from '@/lib/notifications/enqueue';
import { formatDateTime } from '@/lib/utils/dates';
import type {
  AppointmentOutcomeInput,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from '@/lib/schemas/appointments';

/**
 * lib/data/appointments.ts
 * Owner: Member B
 * Data access layer for doctor appointments and scheduling.
 * All user queries run under withUserTx for Postgres Row Level Security.
 */

const companion = alias(schema.users, 'companion');
const creator = alias(schema.users, 'creator');

export type AppointmentView = {
  id: string;
  circleId: string;
  title: string;
  doctorName: string | null;
  specialty: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  status: schema.Appointment['status'];
  accompaniedBy: string | null;
  companionName: string | null;
  companionAvatar: string | null;
  notes: string | null;
  sensitivity: schema.Appointment['sensitivity'];
  createdBy: string;
  creatorName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const appointmentColumns = {
  id: schema.appointments.id,
  circleId: schema.appointments.circleId,
  title: schema.appointments.title,
  doctorName: schema.appointments.doctorName,
  specialty: schema.appointments.specialty,
  location: schema.appointments.location,
  startsAt: schema.appointments.startsAt,
  endsAt: schema.appointments.endsAt,
  status: schema.appointments.status,
  accompaniedBy: schema.appointments.accompaniedBy,
  companionName: companion.fullName,
  companionAvatar: companion.avatarUrl,
  notes: schema.appointments.notes,
  sensitivity: schema.appointments.sensitivity,
  createdBy: schema.appointments.createdBy,
  creatorName: creator.fullName,
  createdAt: schema.appointments.createdAt,
  updatedAt: schema.appointments.updatedAt,
};

function appointmentBaseQuery(tx: Parameters<Parameters<typeof withUserTx>[1]>[0]) {
  return tx
    .select(appointmentColumns)
    .from(schema.appointments)
    .leftJoin(companion, eq(schema.appointments.accompaniedBy, companion.id))
    .leftJoin(creator, eq(schema.appointments.createdBy, creator.id));
}

/** Lists appointments grouped by Upcoming or Past tabs. */
export async function listAppointments(
  ctx: CircleContext,
  tab: 'upcoming' | 'past' = 'upcoming',
): Promise<AppointmentView[]> {
  const now = new Date();

  return withUserTx(ctx.userId, async (tx) => {
    let whereCondition;

    if (tab === 'upcoming') {
      whereCondition = and(
        eq(schema.appointments.circleId, ctx.circleId),
        isNull(schema.appointments.deletedAt),
        or(
          and(
            inArray(schema.appointments.status, ['scheduled', 'rescheduled']),
            sql`${schema.appointments.endsAt} >= ${now.toISOString()}::timestamptz`,
          ),
        ),
      );
    } else {
      whereCondition = and(
        eq(schema.appointments.circleId, ctx.circleId),
        isNull(schema.appointments.deletedAt),
        or(
          sql`${schema.appointments.endsAt} < ${now.toISOString()}::timestamptz`,
          inArray(schema.appointments.status, ['completed', 'missed', 'cancelled']),
        ),
      );
    }

    const rows = await appointmentBaseQuery(tx)
      .where(whereCondition)
      .orderBy(
        tab === 'upcoming'
          ? asc(schema.appointments.startsAt)
          : desc(schema.appointments.startsAt),
      );

    return rows as AppointmentView[];
  });
}

/** Fetches a single appointment by id with companion and creator metadata. */
export async function getAppointment(
  ctx: CircleContext,
  appointmentId: string,
): Promise<AppointmentView | null> {
  return withUserTx(ctx.userId, async (tx) => {
    const [row] = await appointmentBaseQuery(tx)
      .where(
        and(
          eq(schema.appointments.id, appointmentId),
          eq(schema.appointments.circleId, ctx.circleId),
          isNull(schema.appointments.deletedAt),
        ),
      )
      .limit(1);

    return (row as AppointmentView) || null;
  });
}

/** Helper to enqueue neutral reminders 24 hours and 2 hours before an appointment. */
async function scheduleAppointmentReminders(
  ctx: CircleContext,
  appointmentId: string,
  startsAt: Date,
  accompaniedBy?: string | null,
) {
  const now = new Date();
  const times = [
    { label: 'in 24 hours', date: new Date(startsAt.getTime() - 24 * 60 * 60 * 1000) },
    { label: 'in 2 hours', date: new Date(startsAt.getTime() - 2 * 60 * 60 * 1000) },
  ].filter((item) => item.date > now);

  if (times.length === 0) return;

  // Retrieve coordinators and owners to notify alongside the accompanying person
  const targetUserIds = await withUserTx(ctx.userId, async (tx) => {
    const managers = await tx
      .select({ userId: schema.circleMembers.userId })
      .from(schema.circleMembers)
      .where(
        and(
          eq(schema.circleMembers.circleId, ctx.circleId),
          inArray(schema.circleMembers.role, ['owner', 'coordinator']),
        ),
      );

    const ids = new Set(managers.map((m) => m.userId));
    if (accompaniedBy) ids.add(accompaniedBy);
    return Array.from(ids);
  });

  const timeStr = formatDateTime(startsAt, 'Asia/Kolkata', 'p, d MMM');
  const payload = {
    title: 'Upcoming doctor appointment',
    body: `Doctor appointment is scheduled for ${timeStr}. Open Kinly to view details.`,
  };

  for (const time of times) {
    for (const targetId of targetUserIds) {
      for (const channel of ['email', 'push'] as const) {
        await enqueueNotification(ctx, {
          targetUserId: targetId,
          kind: 'appointment',
          channel,
          entityType: 'appointment',
          entityId: appointmentId,
          remindAt: time.date,
          payload,
        }).catch((err) => {
          console.warn('Could not enqueue appointment reminder:', err);
        });
      }
    }
  }
}

/** Cancels all unsent reminders for an appointment (e.g. on rescheduling or completion). */
async function cancelUnsentAppointmentReminders(
  ctx: CircleContext,
  appointmentId: string,
) {
  await withUserTx(ctx.userId, async (tx) => {
    await tx
      .delete(schema.reminders)
      .where(
        and(
          eq(schema.reminders.circleId, ctx.circleId),
          eq(schema.reminders.entityType, 'appointment'),
          eq(schema.reminders.entityId, appointmentId),
          isNull(schema.reminders.sentAt),
        ),
      );
  });
}

/** Creates an appointment, enqueues reminders, and optionally creates linked preparation/accompany tasks. */
export async function createAppointment(
  ctx: CircleContext,
  input: CreateAppointmentInput,
): Promise<string> {
  const appointment = await withUserTx(ctx.userId, async (tx) => {
    const [inserted] = await tx
      .insert(schema.appointments)
      .values({
        circleId: ctx.circleId,
        title: input.title,
        doctorName: input.doctorName || null,
        specialty: input.specialty || null,
        location: input.location || null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        accompaniedBy: input.accompaniedBy || null,
        notes: input.notes || null,
        sensitivity: input.sensitivity,
        createdBy: ctx.userId,
      })
      .returning({ id: schema.appointments.id });

    return inserted;
  });

  // Enqueue 24h & 2h appointment reminders
  await scheduleAppointmentReminders(ctx, appointment.id, input.startsAt, input.accompaniedBy);

  // Auto-generate linked tasks via frozen contract createTaskCore
  if (input.createPrepTask) {
    const prepDue = new Date(input.startsAt.getTime() - 24 * 60 * 60 * 1000);
    await createTaskCore(ctx, {
      title: `Prepare records for ${input.title}`,
      description: `Gather past prescriptions, test reports, and ID documents before the visit.`,
      category: 'paperwork',
      priority: 'normal',
      dueAt: prepDue > new Date() ? prepDue : input.startsAt,
      linkedEntityType: 'appointment',
      linkedEntityId: appointment.id,
    }).catch((err) => console.warn('Failed to create prep task:', err));
  }

  if (input.createAccompanyTask && input.accompaniedBy) {
    await createTaskCore(ctx, {
      title: `Accompany to ${input.title}`,
      description: `Accompany to clinic at ${input.location || 'scheduled location'}.`,
      category: 'appointment',
      priority: 'high',
      dueAt: input.startsAt,
      assignedTo: input.accompaniedBy,
      linkedEntityType: 'appointment',
      linkedEntityId: appointment.id,
    }).catch((err) => console.warn('Failed to create accompany task:', err));
  }

  return appointment.id;
}

/** Updates appointment details and adjusts reminders if time changed. */
export async function updateAppointment(
  ctx: CircleContext,
  input: UpdateAppointmentInput,
): Promise<void> {
  const existing = await getAppointment(ctx, input.appointmentId);
  if (!existing) {
    throw new Error('Appointment not found.');
  }

  const timeChanged =
    existing.startsAt.getTime() !== input.startsAt.getTime() ||
    existing.endsAt.getTime() !== input.endsAt.getTime() ||
    existing.accompaniedBy !== input.accompaniedBy;

  await withUserTx(ctx.userId, async (tx) => {
    await tx
      .update(schema.appointments)
      .set({
        title: input.title,
        doctorName: input.doctorName || null,
        specialty: input.specialty || null,
        location: input.location || null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        accompaniedBy: input.accompaniedBy || null,
        notes: input.notes || null,
        sensitivity: input.sensitivity,
        status: input.status ?? existing.status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.appointments.id, input.appointmentId),
          eq(schema.appointments.circleId, ctx.circleId),
        ),
      );
  });

  if (timeChanged) {
    await cancelUnsentAppointmentReminders(ctx, input.appointmentId);
    await scheduleAppointmentReminders(
      ctx,
      input.appointmentId,
      input.startsAt,
      input.accompaniedBy,
    );
  }
}

/** Records post-appointment outcome ("How did it go?"). */
export async function recordAppointmentOutcome(
  ctx: CircleContext,
  input: AppointmentOutcomeInput,
): Promise<void> {
  const existing = await getAppointment(ctx, input.appointmentId);
  if (!existing) {
    throw new Error('Appointment not found.');
  }

  await withUserTx(ctx.userId, async (tx) => {
    if (input.status === 'rescheduled' && input.rescheduleStartsAt && input.rescheduleEndsAt) {
      await tx
        .update(schema.appointments)
        .set({
          status: 'rescheduled',
          startsAt: input.rescheduleStartsAt,
          endsAt: input.rescheduleEndsAt,
          notes: input.notes || existing.notes,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.appointments.id, input.appointmentId),
            eq(schema.appointments.circleId, ctx.circleId),
          ),
        );
    } else {
      await tx
        .update(schema.appointments)
        .set({
          status: input.status,
          notes: input.notes || existing.notes,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.appointments.id, input.appointmentId),
            eq(schema.appointments.circleId, ctx.circleId),
          ),
        );
    }
  });

  await cancelUnsentAppointmentReminders(ctx, input.appointmentId);

  if (input.status === 'rescheduled' && input.rescheduleStartsAt) {
    await scheduleAppointmentReminders(
      ctx,
      input.appointmentId,
      input.rescheduleStartsAt,
      existing.accompaniedBy,
    );
  }
}

/** Soft deletes an appointment and cleans up pending reminders. */
export async function deleteAppointment(
  ctx: CircleContext,
  appointmentId: string,
): Promise<void> {
  await withUserTx(ctx.userId, async (tx) => {
    await tx
      .update(schema.appointments)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(schema.appointments.id, appointmentId),
          eq(schema.appointments.circleId, ctx.circleId),
        ),
      );
  });

  await cancelUnsentAppointmentReminders(ctx, appointmentId);
}
