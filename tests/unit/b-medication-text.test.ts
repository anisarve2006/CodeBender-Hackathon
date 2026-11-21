import { describe, it, expect } from 'vitest';
import { createMedicationSchema, updateMedicationSchema, MEDICATION_COPY } from '@/lib/schemas/medications';

const CIRCLE_ID = '11111111-2222-4333-8444-555555555555';
const MED_ID = '3f2a1c9e-8b7d-4e6f-9a0b-1c2d3e4f5a6b';

describe('medication copy', () => {
  it('uses the exact "As written on prescription" label', () => {
    expect(MEDICATION_COPY.asWrittenLabel).toBe('As written on prescription');
  });

  it('uses the exact persistent disclaimer', () => {
    expect(MEDICATION_COPY.disclaimer).toBe(
      'Family Care Hub organises information only and does not provide medical advice. Always consult a doctor.',
    );
  });
});

describe('instructionsAsWritten is stored verbatim', () => {
  const verbatim = '  Take 1 tablet  twice daily\n\t— with food; do NOT crush.  ';

  it('keeps whitespace, line breaks, punctuation and symbols exactly as typed', () => {
    const result = createMedicationSchema.safeParse({
      circleId: CIRCLE_ID,
      name: 'Amlodipine',
      instructionsAsWritten: verbatim,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.instructionsAsWritten).toBe(verbatim);
    }
  });

  it('keeps instructions unchanged on update too', () => {
    const result = updateMedicationSchema.safeParse({
      id: MED_ID,
      circleId: CIRCLE_ID,
      instructionsAsWritten: verbatim,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.instructionsAsWritten).toBe(verbatim);
    }
  });

  it('accepts exactly 500 characters and rejects 501', () => {
    const base = { circleId: CIRCLE_ID, name: 'Amlodipine' };
    expect(
      createMedicationSchema.safeParse({ ...base, instructionsAsWritten: 'x'.repeat(500) }).success,
    ).toBe(true);
    expect(
      createMedicationSchema.safeParse({ ...base, instructionsAsWritten: 'x'.repeat(501) }).success,
    ).toBe(false);
  });
});

describe('no computed dosage fields', () => {
  it('strips any dosage or frequency fields that are sent in', () => {
    const result = createMedicationSchema.safeParse({
      circleId: CIRCLE_ID,
      name: 'Amlodipine',
      instructionsAsWritten: 'Take one tablet daily',
      dosage: '5 mg',
      frequency: 'daily',
      doseMg: 5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const keys = Object.keys(result.data);
      expect(keys).not.toContain('dosage');
      expect(keys).not.toContain('frequency');
      expect(keys).not.toContain('doseMg');
    }
  });

  it('does not change a partial update to stored quantities (no defaulted quantity fields)', () => {
    const result = updateMedicationSchema.safeParse({ id: MED_ID, circleId: CIRCLE_ID, name: 'Amlodipine' });
    expect(result.success).toBe(true);
    if (result.success) {
      const keys = Object.keys(result.data);
      expect(keys).not.toContain('initialQuantity');
      expect(keys).not.toContain('dailyUsage');
    }
  });
});

describe('medication date order', () => {
  it('rejects an end date before the start date', () => {
    const result = createMedicationSchema.safeParse({
      circleId: CIRCLE_ID,
      name: 'Amlodipine',
      instructionsAsWritten: 'Take one tablet daily',
      startDate: '2030-03-10',
      endDate: '2030-03-01',
    });
    expect(result.success).toBe(false);
  });
});
