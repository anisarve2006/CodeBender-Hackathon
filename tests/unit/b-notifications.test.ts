import { describe, it, expect } from 'vitest';
import { formatNeutralReminder } from '@/lib/jobs/send-reminders';

describe('Member B: Notification Sanitization & Neutral Copy Guardrails', () => {
  const KINDS = ['appointment', 'refill', 'task_due', 'nudge', 'escalation', 'unknown'];
  const CIRCLE_NAME = 'Sharma Family Circle';

  it('generates non-empty title and body for all notification kinds', () => {
    for (const kind of KINDS) {
      const neutral = formatNeutralReminder(kind, CIRCLE_NAME);
      expect(neutral.title).toBeTruthy();
      expect(neutral.body).toBeTruthy();
      expect(neutral.body).toContain(CIRCLE_NAME);
      expect(neutral.url).toBe('/');
    }
  });

  it('strictly contains zero medicine names, dosages, or diagnoses in notification text', () => {
    const FORBIDDEN_STRINGS = [
      'metformin',
      'amlodipine',
      'atorvastatin',
      'insulin',
      'mg',
      'tablet',
      'diabetes',
      'hypertension',
      'blood pressure',
      'cancer',
      'ecg',
      'mri',
      'prescription',
      'diagnosis',
      'abnormal',
      'pathology',
    ];

    for (const kind of KINDS) {
      const neutral = formatNeutralReminder(kind, CIRCLE_NAME);
      const combined = `${neutral.title} ${neutral.body}`.toLowerCase();

      for (const forbidden of FORBIDDEN_STRINGS) {
        expect(combined).not.toContain(forbidden);
      }
    }
  });

  it('directs the recipient to log in to view clinical details', () => {
    const refillReminder = formatNeutralReminder('refill', CIRCLE_NAME);
    expect(refillReminder.body.toLowerCase()).toContain('log in');

    const apptReminder = formatNeutralReminder('appointment', CIRCLE_NAME);
    expect(apptReminder.body.toLowerCase()).toContain('log in');
  });
});
