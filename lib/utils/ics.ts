/**
 * Pure iCalendar (RFC 5545) helpers for the appointment ICS feed.
 * Owner: Member B
 *
 * No I/O and no server-only imports, so this module is safe to unit test.
 */

const CRLF = '\r\n';
const MAX_LINE_OCTETS = 75;
const encoder = new TextEncoder();

export interface AppointmentIcsInput {
  id: string;
  startsAt: Date;
  endsAt: Date;
  location?: string | null;
  doctorName?: string | null;
  specialty?: string | null;
  recipientName?: string | null;
}

/** Escapes a TEXT value per RFC 5545 section 3.3.11. Backslash must be escaped first. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Folds a content line at 75 octets. Continuation lines start with one space, and multi-byte characters are never split. */
export function foldIcsLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let currentOctets = 0;

  for (const ch of line) {
    const size = encoder.encode(ch).length;
    // Continuation lines carry a leading space, which counts toward the 75-octet limit.
    const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    if (currentOctets + size > limit) {
      parts.push(current);
      current = ch;
      currentOctets = size;
    } else {
      current += ch;
      currentOctets += size;
    }
  }
  parts.push(current);

  return parts.map((part, i) => (i === 0 ? part : ` ${part}`)).join(CRLF);
}

/** Formats a Date as a UTC iCalendar DATE-TIME: YYYYMMDDTHHMMSSZ. */
export function formatIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Builds a complete VCALENDAR document for one appointment.
 * The SUMMARY is neutral and the DESCRIPTION holds only doctor name and specialty (no notes, medicines or diagnoses).
 */
export function buildAppointmentIcs(input: AppointmentIcsInput, dtStamp: Date = new Date()): string {
  const recipient = input.recipientName || 'Family Member';
  const location = input.location?.trim() ?? '';

  const descriptionLines = [
    input.doctorName ? `Doctor: ${input.doctorName}` : null,
    input.specialty ? `Specialty: ${input.specialty}` : null,
  ].filter((line): line is string => line !== null);

  const contentLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Family Care Hub//Appointments//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${input.id}@family-care-hub`,
    `DTSTAMP:${formatIcsUtc(dtStamp)}`,
    `DTSTART:${formatIcsUtc(input.startsAt)}`,
    `DTEND:${formatIcsUtc(input.endsAt)}`,
    `SUMMARY:${escapeIcsText(`Doctor appointment – ${recipient}`)}`,
  ];

  if (location) {
    contentLines.push(`LOCATION:${escapeIcsText(location)}`);
  }
  if (descriptionLines.length > 0) {
    contentLines.push(`DESCRIPTION:${escapeIcsText(descriptionLines.join('\n'))}`);
  }

  contentLines.push('END:VEVENT', 'END:VCALENDAR');

  return `${contentLines.map(foldIcsLine).join(CRLF)}${CRLF}`;
}
