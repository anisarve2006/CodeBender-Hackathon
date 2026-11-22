import { describe, it, expect } from 'vitest';
import {
  classifyInvitationError,
  invitationErrorMessage,
  INVITATION_ERROR_MESSAGES,
} from '@/lib/data/invitation-errors';

describe('Invitation error mapping', () => {
  it('maps an expired or already-used token to a plain message', () => {
    const err = new Error('Invalid, expired, or already used invitation token');
    expect(classifyInvitationError(err)).toBe('unavailable');
    expect(invitationErrorMessage(err)).toBe(INVITATION_ERROR_MESSAGES.unavailable);
  });

  it('maps a wrong-email invitation to a plain message', () => {
    const err = new Error('Invitation was issued to a different email address');
    expect(classifyInvitationError(err)).toBe('wrong_email');
  });

  it('maps an unverified account to the verify-first message', () => {
    const err = new Error('Must be signed in with a verified email to accept invitation');
    expect(classifyInvitationError(err)).toBe('unverified');
  });

  it('maps a permission failure when creating invitations', () => {
    const err = new Error('Not authorized to create invitations in this circle');
    expect(classifyInvitationError(err)).toBe('forbidden');
  });

  it('finds the matching text on a wrapped cause', () => {
    const wrapped = new Error('Failed query: select accept_invitation($1) as circle_id', {
      cause: new Error('Invitation was issued to a different email address'),
    });
    expect(classifyInvitationError(wrapped)).toBe('wrong_email');
  });

  it('never leaks raw database text for unknown errors', () => {
    const raw = new Error('duplicate key value violates unique constraint "circle_members_pkey" DETAIL: Key (user_id)=(abc)');
    expect(classifyInvitationError(raw)).toBe('unknown');
    const message = invitationErrorMessage(raw);
    expect(message).toBe(INVITATION_ERROR_MESSAGES.unknown);
    expect(message).not.toMatch(/duplicate key|constraint|DETAIL|circle_members/i);
  });

  it('handles non-Error values without throwing', () => {
    expect(classifyInvitationError(undefined)).toBe('unknown');
    expect(classifyInvitationError('Invalid, expired, or already used invitation token')).toBe('unavailable');
  });
});
