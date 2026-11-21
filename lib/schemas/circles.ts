import { z } from 'zod';

/**
 * lib/schemas/circles.ts
 * Owner: Member A
 * Circle creation and onboarding wizard steps 1-2.
 * Medical fields are validated for shape only and stored exactly as entered.
 */

export const createCircleSchema = z.object({
  name: z.string().min(3, 'Circle name must be at least 3 characters').max(60),
  consentConfirmed: z.literal(true, {
    message: 'You must confirm care recipient consent under DPDP Act 2023',
  }),
  recipientFullName: z.string().min(2, 'Recipient full name is required').max(100),
  recipientDob: z.string().optional(),
  recipientBloodGroup: z.string().max(10).optional(),
  allergies: z.array(z.string()).default([]),
});

export type CreateCircleInput = z.infer<typeof createCircleSchema>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE = /^[+\d\s()-]{6,20}$/;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Wizard step 1: circle name and DPDP consent. */
export const circleNameStepSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Give the circle a name of at least 3 characters.')
    .max(60, 'Keep the circle name to 60 characters or fewer.'),
  consentConfirmed: z.boolean().refine((value) => value === true, {
    message: 'Please confirm consent under the DPDP Act 2023 to continue.',
  }),
});

export type CircleNameStepInput = z.infer<typeof circleNameStepSchema>;

/** Wizard step 2 form values (what the user types). */
export const recipientFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter the care recipient's full name.")
    .max(100, 'Keep the name to 100 characters or fewer.'),
  dateOfBirth: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' ||
        (ISO_DATE.test(value) && !Number.isNaN(Date.parse(value)) && value <= todayIso()),
      { message: 'Enter a valid date of birth that is not in the future.' },
    ),
  bloodGroup: z.string().trim().max(10, 'Keep the blood group to 10 characters or fewer.'),
  allergies: z.string().trim().max(500, 'Keep the allergies list to 500 characters or fewer.'),
  primaryContactName: z
    .string()
    .trim()
    .max(100, 'Keep the contact name to 100 characters or fewer.'),
  primaryContactPhone: z
    .string()
    .trim()
    .refine((value) => value === '' || PHONE.test(value), {
      message: 'Enter a phone number using digits, spaces, +, brackets or hyphens.',
    }),
  primaryContactRelationship: z
    .string()
    .trim()
    .max(50, 'Keep the relationship to 50 characters or fewer.'),
});

export type RecipientFormInput = z.infer<typeof recipientFormSchema>;

/** Server-side input for saving the care recipient profile. */
export const recipientStepSchema = recipientFormSchema.extend({
  circleId: z.string().uuid('Something went wrong. Please start setup again.'),
});

export type RecipientStepInput = z.infer<typeof recipientStepSchema>;

/**
 * Splits the free-text allergies field into a list. Entries are kept as the
 * user wrote them (trimmed); nothing is interpreted.
 */
export function parseAllergies(text: string): string[] {
  return text
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 30);
}
