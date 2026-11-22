import { describe, it, expect } from 'vitest';
import { UPDATE_MOODS, isKnownMood, updateFormSchema } from '@/lib/schemas/updates';
import { changeRoleSchema, ASSIGNABLE_ROLES } from '@/lib/schemas/members';

const CIRCLE_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';

describe('update mood enum', () => {
  it('lists exactly good, okay, tired and unwell', () => {
    expect([...UPDATE_MOODS]).toEqual(['good', 'okay', 'tired', 'unwell']);
  });

  it.each(['good', 'okay', 'tired', 'unwell'])('accepts %s in the quick-add form schema', (mood) => {
    const result = updateFormSchema.safeParse({ body: 'Had a calm morning', mood });
    expect(result.success).toBe(true);
  });

  it.each(['happy', 'sad', 'GOOD', '', 'fine'])('rejects %j in the quick-add form schema', (mood) => {
    const result = updateFormSchema.safeParse({ body: 'Had a calm morning', mood });
    expect(result.success).toBe(false);
  });

  it('isKnownMood recognises the four moods and rejects free text from older rows', () => {
    expect(isKnownMood('tired')).toBe(true);
    expect(isKnownMood('ecstatic')).toBe(false);
    expect(isKnownMood(null)).toBe(false);
  });
});

describe('member role schema', () => {
  it.each(['owner', 'coordinator', 'caregiver', 'viewer'])('accepts assignable role %s', (role) => {
    const result = changeRoleSchema.safeParse({ circleId: CIRCLE_ID, userId: USER_ID, role });
    expect(result.success).toBe(true);
  });

  it('does not allow care_recipient to be assigned from settings', () => {
    expect(ASSIGNABLE_ROLES).not.toContain('care_recipient');
    const result = changeRoleSchema.safeParse({ circleId: CIRCLE_ID, userId: USER_ID, role: 'care_recipient' });
    expect(result.success).toBe(false);
  });
});
