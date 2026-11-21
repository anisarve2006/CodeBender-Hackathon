import { describe, it, expect, vi } from 'vitest';
import {
  buildAppointmentIcs,
  escapeIcsText,
  foldIcsLine,
  formatIcsUtc,
} from '@/lib/utils/ics';
import {
  updateAppointmentSchema,
  resolveAppointmentSchema,
} from '@/lib/schemas/appointments';

// The DAL module pulls in the database, Redis and notification layers. Stub them so the pure helper can be imported.
vi.mock('@/db/client', () => ({ db: {}, withUserTx: vi.fn() }));
vi.mock('@/lib/data/circle-context', () => ({ requireCircleRole: vi.fn() }));
vi.mock('@/lib/data/tasks-core', () => ({ createTaskCore: vi.fn() }));
vi.mock('@/lib/notifications/enqueue', () => ({ enqueueNotification: vi.fn() }));
vi.mock('@/lib/live/version', () => ({ bumpCircleVersion: vi.fn() }));

import { buildAppointmentReminderMessage } from '@/lib/data/appointments';

const ID = '3f2a1c9e-8b7d-4e6f-9a0b-1c2d3e4f5a6b';
const UUID = '11111111-2222-4333-8444-555555555555';

describe('ICS: date format', () => {
  it('formats DTSTART and DTEND as UTC YYYYMMDDTHHMMSSZ', () => {
    const ics = buildAppointmentIcs(
      {
        id: ID,
        startsAt: new Date('2030-03-05T04:30:00.000Z'),
        endsAt: new Date('2030-03-05T05:15:00.000Z'),
        recipientName: 'Kamala',
      },
      new Date('2030-03-01T00:00:00.000Z'),
    );
    expect(ics).toContain('DTSTART:20300305T043000Z\r\n');
    expect(ics).toContain('DTEND:20300305T051500Z\r\n');
    expect(ics).toContain('DTSTAMP:20300301T000000Z\r\n');
    expect(formatIcsUtc(new Date('2030-03-05T04:30:00.000Z'))).toBe('20300305T043000Z');
  });

  it('wraps the document in VCALENDAR/VEVENT with CRLF endings', () => {
    const ics = buildAppointmentIcs({
      id: ID,
      startsAt: new Date('2030-03-05T04:30:00.000Z'),
      endsAt: new Date('2030-03-05T05:15:00.000Z'),
    });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('BEGIN:VEVENT\r\n');
    expect(ics).toContain('END:VEVENT\r\n');
    expect(ics).toContain(`UID:${ID}@family-care-hub\r\n`);
  });
});

describe('ICS: text escaping', () => {
  it('escapes commas, semicolons, backslashes and newlines', () => {
    expect(escapeIcsText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
  });

  it('escapes backslash first so escape sequences are not double-escaped', () => {
    expect(escapeIcsText('\\,')).toBe('\\\\\\,');
  });

  it('applies escaping to LOCATION', () => {
    const ics = buildAppointmentIcs({
      id: ID,
      startsAt: new Date('2030-03-05T04:30:00.000Z'),
      endsAt: new Date('2030-03-05T05:15:00.000Z'),
      location: 'Clinic, Pune; Block A',
    });
    expect(ics).toContain('LOCATION:Clinic\\, Pune\\; Block A\r\n');
  });
});

describe('ICS: content', () => {
  it('uses a neutral SUMMARY with the recipient name only', () => {
    const ics = buildAppointmentIcs({
      id: ID,
      startsAt: new Date('2030-03-05T04:30:00.000Z'),
      endsAt: new Date('2030-03-05T05:15:00.000Z'),
      recipientName: 'Kamala',
      doctorName: 'Dr. Rao',
      specialty: 'Cardiology',
    });
    expect(ics).toContain('SUMMARY:Doctor appointment – Kamala\r\n');
    expect(ics).toContain('DESCRIPTION:Doctor: Dr. Rao\\nSpecialty: Cardiology\r\n');
  });

  it('falls back to "Family Member" when no recipient name is given', () => {
    const ics = buildAppointmentIcs({
      id: ID,
      startsAt: new Date('2030-03-05T04:30:00.000Z'),
      endsAt: new Date('2030-03-05T05:15:00.000Z'),
    });
    expect(ics).toContain('SUMMARY:Doctor appointment – Family Member\r\n');
    expect(ics).not.toContain('DESCRIPTION:');
    expect(ics).not.toContain('LOCATION:');
  });
});

describe('ICS: line folding', () => {
  it('keeps every physical line within 75 octets', () => {
    const ics = buildAppointmentIcs({
      id: ID,
      startsAt: new Date('2030-03-05T04:30:00.000Z'),
      endsAt: new Date('2030-03-05T05:15:00.000Z'),
      location: 'x'.repeat(300),
    });
    const encoder = new TextEncoder();
    for (const line of ics.split('\r\n')) {
      if (line.length === 0) continue;
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it('unfolds back to the original content and never splits multi-byte characters', () => {
    const long = 'é'.repeat(80); // 2 octets per character
    const folded = foldIcsLine(`LOCATION:${long}`);
    const unfolded = folded.replace(/\r\n /g, '');
    expect(unfolded).toBe(`LOCATION:${long}`);
    for (const part of folded.split('\r\n')) {
      expect(part).not.toContain('\uFFFD');
    }
  });

  it('places continuation lines with a single leading space', () => {
    const folded = foldIcsLine('a'.repeat(160));
    const lines = folded.split('\r\n');
    expect(lines.length).toBeGreaterThan(1);
    for (const continuation of lines.slice(1)) {
      expect(continuation.startsWith(' ')).toBe(true);
    }
  });
});

describe('updateAppointmentSchema (partial updates)', () => {
  it('passes a title-only update', () => {
    const result = updateAppointmentSchema.safeParse({ id: ID, title: 'Eye check-up' });
    expect(result.success).toBe(true);
  });

  it('fails when endsAt is before startsAt and both times are given', () => {
    const result = updateAppointmentSchema.safeParse({
      id: ID,
      startsAt: new Date('2030-01-02T10:00:00.000Z'),
      endsAt: new Date('2030-01-02T09:00:00.000Z'),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.endsAt).toBeDefined();
    }
  });

  it('passes an endsAt-only update (cross-field check needs both times)', () => {
    const result = updateAppointmentSchema.safeParse({
      id: ID,
      endsAt: new Date('2030-01-02T09:00:00.000Z'),
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-UUID id', () => {
    const result = updateAppointmentSchema.safeParse({ id: 'not-a-uuid', title: 'Eye check-up' });
    expect(result.success).toBe(false);
  });

  it('accepts a circleId in the update body', () => {
    const result = updateAppointmentSchema.safeParse({ id: ID, circleId: UUID, title: 'Eye check-up' });
    expect(result.success).toBe(true);
  });
});

describe('resolveAppointmentSchema ("How did it go?")', () => {
  it.each(['completed', 'missed', 'rescheduled'])('accepts outcome %s', (outcome) => {
    expect(resolveAppointmentSchema.safeParse({ outcome }).success).toBe(true);
  });

  it.each(['scheduled', 'cancelled', 'done', ''])('rejects outcome %j', (outcome) => {
    expect(resolveAppointmentSchema.safeParse({ outcome }).success).toBe(false);
  });

  it('accepts notes of exactly 2000 characters', () => {
    const result = resolveAppointmentSchema.safeParse({
      outcome: 'completed',
      notes: 'n'.repeat(2000),
    });
    expect(result.success).toBe(true);
  });

  it('rejects notes over 2000 characters', () => {
    const result = resolveAppointmentSchema.safeParse({
      outcome: 'completed',
      notes: 'n'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

describe('appointment reminder payload text', () => {
  const FORBIDDEN = [
    'medicine',
    'medication',
    'tablet',
    'dose',
    'prescription',
    'document',
    'report',
    'diagnosis',
  ];

  it.each(['in 24 hours', 'in 2 hours'])(
    'builds a neutral message for "%s" with no medicine or document words',
    (label) => {
      const message = buildAppointmentReminderMessage(label);
      expect(message).toBe(`Doctor appointment scheduled ${label}`);
      const lower = message.toLowerCase();
      for (const word of FORBIDDEN) {
        expect(lower).not.toContain(word);
      }
    },
  );
});
