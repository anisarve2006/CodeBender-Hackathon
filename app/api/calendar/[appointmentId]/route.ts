import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { withUserTx } from '@/db/client';
import * as schema from '@/db/schema';
import { and, eq, isNull } from 'drizzle-orm';

/**
 * iCalendar (.ics) download route
 * Owner: Member B
 * Generates an RFC 5545 calendar event file after checking circle membership.
 */

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  const session = await validateSession();
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { appointmentId } = await params;

  try {
    const data = await withUserTx(session.user.id, async (tx) => {
      const [appt] = await tx
        .select()
        .from(schema.appointments)
        .where(
          and(
            eq(schema.appointments.id, appointmentId),
            isNull(schema.appointments.deletedAt),
          ),
        )
        .limit(1);

      if (!appt) return null;

      const [recipient] = await tx
        .select({ fullName: schema.careRecipients.fullName })
        .from(schema.careRecipients)
        .where(eq(schema.careRecipients.circleId, appt.circleId))
        .limit(1);

      return { appt, recipientName: recipient?.fullName || 'Care Recipient' };
    });

    if (!data) {
      return new NextResponse('Appointment not found or access denied', { status: 404 });
    }

    const { appt, recipientName } = data;
    const summary = `Doctor appointment \u2013 ${recipientName}`;
    const descParts = [
      `Appointment: ${appt.title}`,
      appt.doctorName ? `Doctor: ${appt.doctorName}` : null,
      appt.specialty ? `Specialty: ${appt.specialty}` : null,
      appt.notes ? `Notes: ${appt.notes}` : null,
    ].filter(Boolean);

    const description = escapeIcsText(descParts.join('\n'));
    const location = escapeIcsText(appt.location || '');

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Family Care Hub//Doctor Appointments//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${appt.id}@familycarehub.app`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(appt.startsAt)}`,
      `DTEND:${formatIcsDate(appt.endsAt)}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      `DESCRIPTION:${description}`,
      location ? `LOCATION:${location}` : null,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean);

    const icsContent = icsLines.join('\r\n') + '\r\n';

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="appointment-${appt.id.slice(0, 8)}.ics"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Failed to generate calendar file:', err);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
