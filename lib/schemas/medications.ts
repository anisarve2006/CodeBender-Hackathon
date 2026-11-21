import { z } from 'zod';

/**
 * Medicine schemas (shared by client forms and server actions).
 * Owner: Member B
 *
 * instructionsAsWritten is stored and shown VERBATIM: no trimming, no normalising, no computed dosage fields.
 */

/** Fixed copy shown with every medicine. Shared by the card and the text tests. */
export const MEDICATION_COPY = {
  asWrittenLabel: 'As written on prescription',
  disclaimer:
    'Family Care Hub organises information only and does not provide medical advice. Always consult a doctor.',
} as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date format YYYY-MM-DD');

const medicationDetailsSchema = z.object({
  name: z.string().min(2, 'Medicine name is required').max(100),
  strength: z.string().max(40).optional(),
  form: z.string().max(40).optional(),
  instructionsAsWritten: z
    .string()
    .min(2, 'Copy the instructions exactly as written on the prescription')
    .max(500),
  prescribedBy: z.string().max(80).optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
});

/** End date must not be before the start date, when both are given. */
const dateOrderRule = {
  check: (data: { startDate?: string; endDate?: string }) =>
    !data.startDate || !data.endDate || data.endDate >= data.startDate,
  options: {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  },
};

export const createMedicationSchema = medicationDetailsSchema
  .extend({
    circleId: z.string().uuid(),
    initialQuantity: z.coerce.number().int('Enter a whole number').min(0).default(0),
    dailyUsage: z.coerce.number().int('Enter a whole number').min(1, 'Daily usage must be at least 1').default(1),
  })
  .refine(dateOrderRule.check, dateOrderRule.options);

/**
 * Partial update of the medicine details only. Quantity and daily usage are changed through the refill actions,
 * so they are deliberately absent here (a .partial() of a defaulted field would otherwise overwrite stored values).
 */
export const updateMedicationSchema = medicationDetailsSchema
  .partial()
  .extend({
    circleId: z.string().uuid(),
    id: z.string().uuid(),
    isActive: z.boolean().optional(),
  })
  .refine(dateOrderRule.check, dateOrderRule.options);

export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;
export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>;
