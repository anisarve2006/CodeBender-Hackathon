import 'server-only';
import { and, asc, desc, eq, gte, isNull, lt } from 'drizzle-orm';
import { withUserTx } from '@/db/client';
import * as schema from '@/db/schema';
import type { CircleContext } from '@/lib/types/app';
import { requireCircleRole } from '@/lib/data/circle-context';
import { createTaskCore } from '@/lib/data/tasks-core';
import { enqueueNotification } from '@/lib/notifications/enqueue';
import { bumpCircleVersion } from '@/lib/live/version';
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  ResolveAppointmentInput,
} from '@/lib/schemas/appointments';

const HOUR_MS = 60 * 60 * 1000;

/** Neutral reminder offsets: no doctor, specialty or document details leave the app. */
const REMINDER_OFFSETS = [
  { hours: 24, label: 'in 24 hours' },
  { hours: 2, label: 'in 2 hours' },
] as const;

/** Builds the reminder text. Pure: only the timing label, never medicine, document or doctor details. */
export function buildAppointmentReminderMessage(label: string): string {
  return `Doctor appointment scheduled ${label}`;
}

const appointmentColumns = {
  id: schema.appointments.id,
  title: schema.appointments.title,
  doctorName: schema.appointments.doctorName,
  specialty: schema.appointments.specialty,
  location: schema.appointments.location,
  startsAt: schema.appointments.startsAt,
  endsAt: schema.appointments.endsAt,
  status: schema.appointments.status,
  notes: schema.appointments.notes,
  sensitivity: schema.appointments.sensitivity,
  accompaniedBy: schema.appointments.accompaniedBy,
  companionName: schema.users.fullName,
  companionAvatarUrl: schema.users.avatarUrl,
};

/**
 * Upcoming: startsAt >= now, ordered ASC. Past: startsAt < now, ordered DESC.
 */
export async function getAppointments(circleId: string, type: 'upcoming' | 'past') {
  const ctx = await requireCircleRole(circleId);
  const now = new Date();

  return withUserTx(ctx.userId, (tx) =>
    tx
      .select(appointmentColumns)
      .from(schema.appointments)
      .leftJoin(schema.users, eq(schema.appointments.accompaniedBy, schema.users.id))
      .where(
        and(
          eq(schema.appointments.circleId, circleId),
          isNull(schema.appointments.deletedAt),
          type === 'upcoming'
            ? gte(schema.appointments.startsAt, now)
            : lt(schema.appointments.startsAt, now),
        ),
      )
      .orderBy(
        type === 'upcoming'
          ? asc(schema.appointments.startsAt)
          : desc(schema.appointments.startsAt),
      ),
  );
}

/**
 * Returns one appointment in the circle, or null when it does not exist (or is soft-deleted).
 */
export async function getAppointmentById(circleId: string, appointmentId: string) {
  const ctx = await requireCircleRole(circleId);

  const rows = await withUserTx(ctx.userId, (tx) =>
    tx
      .select(appointmentColumns)
      .from(schema.appointments)
      .leftJoin(schema.users, eq(schema.appointments.accompaniedBy, schema.users.id))
      .where(
        and(
          eq(schema.appointments.id, appointmentId),
          eq(schema.appointments.circleId, circleId),
          isNull(schema.appointments.deletedAt),
        ),
      )
      .limit(1),
  );

  return rows[0] ?? null;
}

/**
 * Members of the circle for the companion picker (id + display name only).
 */
export async function getCircleMemberOptions(circleId: string) {
  const ctx = await requireCircleRole(circleId);

  return withUserTx(ctx.userId, (tx) =>
    tx
      .select({ id: schema.users.id, fullName: schema.users.fullName })
      .from(schema.circleMembers)
      .innerJoin(schema.users, eq(schema.circleMembers.userId, schema.users.id))
      .where(eq(schema.circleMembers.circleId, circleId))
      .orderBy(asc(schema.users.fullName)),
  );
}

export type CircleMemberOption = Awaited<ReturnType<typeof getCircleMemberOptions>>[number];

/**
 * Recipients for appointment reminders: the companion (if any) and the circle coordinators.
 */
async function getReminderTargets(ctx: CircleContext, companionId: string | null | undefined) {
  const coordinators = await withUserTx(ctx.userId, (tx) =>
    tx
      .select({ userId: schema.circleMembers.userId })
      .from(schema.circleMembers)
      .where(
        and(
          eq(schema.circleMembers.circleId, ctx.circleId),
          eq(schema.circleMembers.role, 'coordinator'),
        ),
      ),
  );

  const targets = new Set<string>(coordinators.map((c) => c.userId));
  if (companionId) {
    targets.add(companionId);
  }
  return [...targets];
}

/**
 * Enqueues 24h and 2h reminders (push + email) for each target.
 * Reminders whose send time has already passed are skipped.
 */
async function scheduleAppointmentReminders(
  ctx: CircleContext,
  appointment: { id: string; startsAt: Date; accompaniedBy: string | null },
) {
  const targets = await getReminderTargets(ctx, appointment.accompaniedBy);
  const now = Date.now();

  for (const offset of REMINDER_OFFSETS) {
    const remindAt = new Date(appointment.startsAt.getTime() - offset.hours * HOUR_MS);
    if (remindAt.getTime() <= now) {
      continue;
    }

    for (const targetUserId of targets) {
      for (const channel of ['push', 'email'] as const) {
        await enqueueNotification(ctx, {
          targetUserId,
          kind: 'appointment',
          channel,
          entityType: 'appointment',
          entityId: appointment.id,
          remindAt,
          payload: { message: buildAppointmentReminderMessage(offset.label) },
        });
      }
    }
  }
}

/**
 * Inserts the appointment, creates linked preparation/accompany tasks,
 * enqueues reminders and bumps the circle version.
 */
export async function createAppointment(
  ctx: CircleContext,
  input: CreateAppointmentInput,
): Promise<schema.Appointment> {
  const appointment = await withUserTx(ctx.userId, async (tx) => {
    const [row] = await tx
      .insert(schema.appointments)
      .values({
        circleId: ctx.circleId,
        title: input.title,
        doctorName: input.doctorName,
        specialty: input.specialty,
        location: input.location,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        accompaniedBy: input.accompaniedBy,
        notes: input.notes,
        sensitivity: input.sensitivity,
        createdBy: ctx.userId,
      })
      .returning();
    return row;
  });

  if (input.createDocTask) {
    await createTaskCore(ctx, {
      title: `Prepare documents for ${input.doctorName || input.title}`,
      category: 'appointment',
      priority: 'normal',
      dueAt: new Date(appointment.startsAt.getTime() - 24 * HOUR_MS),
      linkedEntityType: 'appointment',
      linkedEntityId: appointment.id,
      assignedTo: ctx.userId,
    });
  }

  if (input.createAccompanyTask && input.accompaniedBy) {
    await createTaskCore(ctx, {
      title: `Accompany to appointment: ${input.title}`,
      category: 'appointment',
      priority: 'high',
      dueAt: appointment.startsAt,
      linkedEntityType: 'appointment',
      linkedEntityId: appointment.id,
      assignedTo: input.accompaniedBy,
    });
  }

  await scheduleAppointmentReminders(ctx, appointment);
  await bumpCircleVersion(ctx.circleId);

  return appointment;
}

/**
 * Updates the appointment, replaces its unsent reminders with fresh 24h/2h ones
 * (only while the appointment is still scheduled), and bumps the circle version.
 */
export async function updateAppointment(
  ctx: CircleContext,
  id: string,
  input: UpdateAppointmentInput,
): Promise<schema.Appointment> {
  const changes: Partial<schema.NewAppointment> = { updatedAt: new Date() };
  if (input.title !== undefined) changes.title = input.title;
  if (input.doctorName !== undefined) changes.doctorName = input.doctorName;
  if (input.specialty !== undefined) changes.specialty = input.specialty;
  if (input.location !== undefined) changes.location = input.location;
  if (input.startsAt !== undefined) changes.startsAt = input.startsAt;
  if (input.endsAt !== undefined) changes.endsAt = input.endsAt;
  if (input.accompaniedBy !== undefined) changes.accompaniedBy = input.accompaniedBy;
  if (input.notes !== undefined) changes.notes = input.notes;
  if (input.sensitivity !== undefined) changes.sensitivity = input.sensitivity;
  if (input.status !== undefined) changes.status = input.status;

  const updated = await withUserTx(ctx.userId, async (tx) => {
    const [row] = await tx
      .update(schema.appointments)
      .set(changes)
      .where(
        and(
          eq(schema.appointments.id, id),
          eq(schema.appointments.circleId, ctx.circleId),
          isNull(schema.appointments.deletedAt),
        ),
      )
      .returning();

    if (row) {
      // Drop pending (unsent) reminders for this appointment; new ones are queued below.
      await tx
        .delete(schema.reminders)
        .where(
          and(
            eq(schema.reminders.circleId, ctx.circleId),
            eq(schema.reminders.kind, 'appointment'),
            eq(schema.reminders.entityType, 'appointment'),
            eq(schema.reminders.entityId, id),
            isNull(schema.reminders.sentAt),
          ),
        );
    }

    return row;
  });

  if (!updated) {
    throw new Error('Appointment not found.');
  }

  if (updated.status === 'scheduled') {
    await scheduleAppointmentReminders(ctx, updated);
  }
  await bumpCircleVersion(ctx.circleId);

  return updated;
}

/**
 * Records the outcome of an appointment ("How did it go?") and optional notes.
 */
export async function resolveAppointment(
  ctx: CircleContext,
  id: string,
  outcome: ResolveAppointmentInput['outcome'],
  notes?: string,
): Promise<schema.Appointment> {
  const changes: Partial<schema.NewAppointment> = {
    status: outcome,
    updatedAt: new Date(),
  };
  if (notes !== undefined) {
    changes.notes = notes;
  }

  const updated = await withUserTx(ctx.userId, async (tx) => {
    const [row] = await tx
      .update(schema.appointments)
      .set(changes)
      .where(
        and(
          eq(schema.appointments.id, id),
          eq(schema.appointments.circleId, ctx.circleId),
          isNull(schema.appointments.deletedAt),
        ),
      )
      .returning();
    return row;
  });

  if (!updated) {
    throw new Error('Appointment not found.');
  }

  await bumpCircleVersion(ctx.circleId);

  return updated;
}
