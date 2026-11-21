/**
 * lib/data/invitation-errors.ts
 * Owner: Member A
 * Maps raw create/accept invitation failures to plain messages.
 * Pure module (no database imports) so it can be unit tested.
 * Raw database text is only matched against, never shown to the user.
 */

export type InvitationErrorKind =
  | 'unavailable'
  | 'wrong_email'
  | 'unverified'
  | 'forbidden'
  | 'unknown';

export const INVITATION_ERROR_MESSAGES: Record<InvitationErrorKind, string> = {
  unavailable:
    'This invitation link has expired or has already been used. Ask the person who invited you to send a new one.',
  wrong_email:
    'This invitation was sent to a different email address. Sign in with the email address it was sent to.',
  unverified: 'Please verify your email address before joining a care circle.',
  forbidden: "You don't have permission to invite people to this circle.",
  unknown: 'We could not complete this step. Please try again in a moment.',
};

/** Collects error messages along the cause chain (drivers often wrap errors). */
function collectMessages(err: unknown): string {
  const parts: string[] = [];
  let current: unknown = err;
  for (let depth = 0; depth < 4 && current !== undefined && current !== null; depth++) {
    if (current instanceof Error) {
      parts.push(current.message);
      current = (current as { cause?: unknown }).cause;
    } else if (typeof current === 'string') {
      parts.push(current);
      break;
    } else {
      break;
    }
  }
  return parts.join(' | ');
}

export function classifyInvitationError(err: unknown): InvitationErrorKind {
  const text = collectMessages(err);
  if (/different email address/i.test(text)) return 'wrong_email';
  if (/Invalid, expired, or already used/i.test(text)) return 'unavailable';
  if (/verified email/i.test(text)) return 'unverified';
  if (/Not authorized/i.test(text)) return 'forbidden';
  return 'unknown';
}

export function invitationErrorMessage(err: unknown): string {
  return INVITATION_ERROR_MESSAGES[classifyInvitationError(err)];
}
