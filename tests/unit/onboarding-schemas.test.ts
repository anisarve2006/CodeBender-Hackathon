import { describe, it, expect } from 'vitest';
import {
  circleNameStepSchema,
  parseAllergies,
  recipientFormSchema,
  recipientStepSchema,
} from '@/lib/schemas/circles';
import {
  cleanInviteRows,
  inviteFormSchema,
  inviteRowSchema,
  sendInvitesSchema,
} from '@/lib/schemas/invitations';

const validRecipient = {
  fullName: 'Kamala Sharma',
  dateOfBirth: '1951-04-12',
  bloodGroup: 'O+',
  allergies: 'penicillin, latex',
  primaryContactName: 'Anjali Sharma',
  primaryContactPhone: '+91 98450 00000',
  primaryContactRelationship: 'daughter',
};

describe('Onboarding step 1: circle name and consent', () => {
  it('accepts a name with consent ticked', () => {
    const result = circleNameStepSchema.safeParse({ name: 'Sharma family', consentConfirmed: true });
    expect(result.success).toBe(true);
  });

  it('trims the name before checking its length', () => {
    expect(circleNameStepSchema.safeParse({ name: '   ab   ', consentConfirmed: true }).success).toBe(false);
  });

  it('rejects a name shorter than 3 characters', () => {
    expect(circleNameStepSchema.safeParse({ name: 'ab', consentConfirmed: true }).success).toBe(false);
  });

  it('requires DPDP consent', () => {
    const result = circleNameStepSchema.safeParse({ name: 'Sharma family', consentConfirmed: false });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/DPDP/);
    }
  });
});

describe('Onboarding step 2: care recipient profile', () => {
  it('accepts a complete profile and stores medical text as entered', () => {
    const result = recipientFormSchema.safeParse(validRecipient);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bloodGroup).toBe('O+');
      expect(result.data.allergies).toBe('penicillin, latex');
    }
  });

  it('accepts an empty date of birth and optional contact fields', () => {
    const result = recipientFormSchema.safeParse({
      ...validRecipient,
      dateOfBirth: '',
      primaryContactName: '',
      primaryContactPhone: '',
      primaryContactRelationship: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a date of birth in the future', () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(recipientFormSchema.safeParse({ ...validRecipient, dateOfBirth: future }).success).toBe(false);
  });

  it('rejects a malformed date of birth', () => {
    expect(recipientFormSchema.safeParse({ ...validRecipient, dateOfBirth: '12/04/1951' }).success).toBe(false);
  });

  it('rejects a phone number with letters', () => {
    expect(
      recipientFormSchema.safeParse({ ...validRecipient, primaryContactPhone: 'call me maybe' }).success,
    ).toBe(false);
  });

  it('requires a full name', () => {
    expect(recipientFormSchema.safeParse({ ...validRecipient, fullName: ' ' }).success).toBe(false);
  });

  it('requires a circle id on the server-side schema', () => {
    expect(recipientStepSchema.safeParse({ ...validRecipient, circleId: 'not-a-uuid' }).success).toBe(false);
    expect(
      recipientStepSchema.safeParse({
        ...validRecipient,
        circleId: '6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f',
      }).success,
    ).toBe(true);
  });

  it('splits allergies on commas, semicolons and newlines, dropping blanks', () => {
    expect(parseAllergies('penicillin, latex;\n  \n dust ,')).toEqual(['penicillin', 'latex', 'dust']);
    expect(parseAllergies('')).toEqual([]);
  });
});

describe('Onboarding step 3: invitation rows', () => {
  it('accepts a valid row with an invitable role', () => {
    expect(inviteRowSchema.safeParse({ email: 'rohit@example.com', role: 'caregiver' }).success).toBe(true);
  });

  it('does not let the wizard invite an owner', () => {
    expect(inviteRowSchema.safeParse({ email: 'rohit@example.com', role: 'owner' }).success).toBe(false);
  });

  it('allows blank rows (they are skipped) but rejects a malformed non-blank email', () => {
    expect(inviteFormSchema.safeParse({ invites: [{ email: '', role: 'viewer' }] }).success).toBe(true);
    const bad = inviteFormSchema.safeParse({ invites: [{ email: 'not-an-email', role: 'viewer' }] });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      expect(bad.error.issues[0].path).toEqual(['invites', 0, 'email']);
    }
  });

  it('drops blank rows and lowercases emails before sending', () => {
    const cleaned = cleanInviteRows([
      { email: '  Vikram@Example.com ', role: 'viewer' },
      { email: '', role: 'caregiver' },
    ]);
    expect(cleaned).toEqual([{ email: 'vikram@example.com', role: 'viewer' }]);
  });

  it('caps the number of rows sent in one request', () => {
    const rows = Array.from({ length: 11 }, (_, i) => ({ email: `p${i}@example.com`, role: 'viewer' as const }));
    expect(sendInvitesSchema.safeParse({ circleId: '6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f', invites: rows }).success).toBe(false);
  });
});
