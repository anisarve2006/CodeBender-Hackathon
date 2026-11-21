import { z } from 'zod';

/**
 * lib/schemas/updates.ts
 * Owner: Member A
 * Family update schemas shared by the quick-add form and the server action.
 * The body is plain text, stored as written; nothing is interpreted.
 */

export const UPDATE_MOODS = ['good', 'okay', 'tired', 'unwell'] as const;
export type UpdateMood = (typeof UPDATE_MOODS)[number];

export const UPDATE_MOOD_LABELS: Record<UpdateMood, string> = {
  good: 'Good',
  okay: 'Okay',
  tired: 'Tired',
  unwell: 'Unwell',
};

export const UPDATE_BODY_MAX = 500;

const updateBodyField = z
  .string()
  .trim()
  .min(2, 'Write a short update before posting.')
  .max(UPDATE_BODY_MAX, `Keep the update to ${UPDATE_BODY_MAX} characters or fewer.`);

/** Client form values. */
export const updateFormSchema = z.object({
  body: updateBodyField,
  mood: z.enum(UPDATE_MOODS, { message: 'Choose how the care recipient is today.' }),
});

export type UpdateFormValues = z.infer<typeof updateFormSchema>;

/** Server action input. */
export const createUpdateSchema = z.object({
  circleId: z.string().uuid(),
  body: updateBodyField,
  mood: z.enum(UPDATE_MOODS),
});

export type CreateUpdateInput = z.infer<typeof createUpdateSchema>;

/** True when a stored mood tag is one of the four known moods (older rows may hold free text). */
export function isKnownMood(value: string | null): value is UpdateMood {
  return value !== null && (UPDATE_MOODS as readonly string[]).includes(value);
}
