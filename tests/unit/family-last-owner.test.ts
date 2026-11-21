import { describe, it, expect } from 'vitest';
import {
  LAST_OWNER_MESSAGE,
  MEMBER_SAVE_FAILED,
  isLastOwnerError,
  memberErrorMessage,
} from '@/lib/data/member-errors';

const RAW_TRIGGER = 'check_last_owner: last owner of circle cannot be removed or demoted';

describe('last-owner error mapping', () => {
  it('maps a raw last-owner trigger error to the plain message', () => {
    expect(memberErrorMessage(new Error(RAW_TRIGGER))).toBe('A circle must keep at least one owner.');
    expect(memberErrorMessage(new Error(RAW_TRIGGER))).toBe(LAST_OWNER_MESSAGE);
  });

  it('matches a last-owner error wrapped in a cause chain and never returns the raw text', () => {
    const wrapped = new Error('Query failed', { cause: new Error(RAW_TRIGGER) });
    const message = memberErrorMessage(wrapped);
    expect(message).toBe(LAST_OWNER_MESSAGE);
    expect(message).not.toContain('check_last_owner');
  });

  it('recognises a last-owner string error', () => {
    expect(isLastOwnerError(RAW_TRIGGER)).toBe(true);
  });

  it('returns the generic save failure for unrelated errors, without the raw text', () => {
    const other = new Error('duplicate key value violates unique constraint "circle_members_pkey"');
    expect(memberErrorMessage(other)).toBe(MEMBER_SAVE_FAILED);
    expect(memberErrorMessage(other)).not.toContain('duplicate key');
  });

  it('returns the generic save failure for non-error values', () => {
    expect(memberErrorMessage(undefined)).toBe(MEMBER_SAVE_FAILED);
    expect(memberErrorMessage(42)).toBe(MEMBER_SAVE_FAILED);
  });
});
