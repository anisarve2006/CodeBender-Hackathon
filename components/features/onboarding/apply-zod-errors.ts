import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import type { ZodError } from 'zod';

/**
 * Copies Zod issues onto React Hook Form fields so every error shows inline.
 * Nested paths such as ['invites', 0, 'email'] become 'invites.0.email'.
 */
export function applyZodErrors<T extends FieldValues>(form: UseFormReturn<T>, error: ZodError): void {
  for (const issue of error.issues) {
    const name = issue.path.map(String).join('.') as Path<T>;
    form.setError(name, { type: 'validate', message: issue.message });
  }
}
