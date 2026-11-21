/**
 * lib/data/member-errors.ts
 * Owner: Member A
 * Maps raw member-management failures to plain messages. Pure module (no
 * database imports) so it can be unit tested. Raw database text is only
 * matched against, never shown to the user.
 */

export const LAST_OWNER_MESSAGE = 'A circle must keep at least one owner.';
export const MEMBER_SAVE_FAILED = 'We could not update this member. Please try again.';

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

/** True when the check_last_owner() trigger rejected the change. */
export function isLastOwnerError(err: unknown): boolean {
  return /last owner/i.test(collectMessages(err));
}

/** Plain message for any member-management failure. */
export function memberErrorMessage(err: unknown): string {
  return isLastOwnerError(err) ? LAST_OWNER_MESSAGE : MEMBER_SAVE_FAILED;
}
