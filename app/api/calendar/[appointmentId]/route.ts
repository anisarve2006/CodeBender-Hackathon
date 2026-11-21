import { NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { withUserTx } from '@/db/client';
import * as schema from '@/db/schema';
import { validateSession } from '@/lib/auth/session';
import { buildAppointmentIcs } from '@/lib/utils/ics';

/**
 * iCalendar ICS feed route (RFC 5545)
 * Owner: Member B
 * The ICS document itself is built by the pure helper in lib/utils/ics.ts.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function notFound() {
  return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  const session = await validateSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { appointmentId } = await params;
  if (!UUID_RE.test(appointmentId)) {
    return notFound();
  }

  const userId = session.user.id;

  // Membership is enforced here: the appointment is only returned when the caller is a member of its circle.
  const rows = await withUserTx(userId, (tx) =>
    tx
      .select({
        id: schema.appointments.id,
        startsAt: schema.appointments.startsAt,
        endsAt: schema.appointments.endsAt,
        location: schema.appointments.location,
        doctorName: schema.appointments.doctorName,
        specialty: schema.appointments.specialty,
        recipientName: schema.careRecipients.fullName,
      })
      .from(schema.appointments)
      .innerJoin(
        schema.circleMembers,
        and(
          eq(schema.circleMembers.circleId, schema.appointments.circleId),
          eq(schema.circleMembers.userId, userId),
        ),
      )
      .leftJoin(
        schema.careRecipients,
        eq(schema.careRecipients.circleId, schema.appointments.circleId),
      )
      .where(and(eq(schema.appointments.id, appointmentId), isNull(schema.appointments.deletedAt)))
      .limit(1),
  );

  const appointment = rows[0];
  if (!appointment) {
    return notFound();
  }

  const body = buildAppointmentIcs(appointment, new Date());

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="appointment.ics"',
      'Cache-Control': 'private, no-store',
    },
  });
}
