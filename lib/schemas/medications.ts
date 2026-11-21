import { z } from 'zod';

/**
 * lib/schemas/medications.ts
 * Owner: Member B
 * Zod schemas for medications and prescription records.
 * Guardrail: Instructions are kept verbatim as written on prescription.
 */

const nameField = z
  .string()
  .trim()
  .min(2, 'Medicine name is required')
  .max(100, 'Keep medicine name to 100 characters or fewer.');

const instructionsField = z
  .string()
  .trim()
  .min(2, 'Enter instructions as written on prescription')
  .max(500, 'Keep instructions to 500 characters or fewer.');

export const createMedicationSchema = z.object({
  circleId: z.string().uuid(),
  name: nameField,
  strength: z.string().trim().max(50).optional(),
  form: z.string().trim().max(50).optional(),
  instructionsAsWritten: instructionsField,
  prescribedBy: z.string().trim().max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  initialQuantity: z.coerce.number().int().min(0, 'Quantity cannot be negative').default(30),
  dailyUsage: z.coerce.number().int().min(1, 'Daily usage must be at least 1').default(1),
  assignedTo: z.string().uuid().nullish(),
});

export const updateMedicationSchema = z.object({
  circleId: z.string().uuid(),
  medicationId: z.string().uuid(),
  name: nameField,
  strength: z.string().trim().max(50).optional(),
  form: z.string().trim().max(50).optional(),
  instructionsAsWritten: instructionsField,
  prescribedBy: z.string().trim().max(100).optional(),
  isActive: z.boolean().default(true),
});

export const medicationRefSchema = z.object({
  circleId: z.string().uuid(),
  medicationId: z.string().uuid(),
});

export const recordRefillSchema = z.object({
  circleId: z.string().uuid(),
  refillId: z.string().uuid(),
  quantityAdded: z.coerce.number().int().min(1, 'Quantity added must be at least 1 unit'),
});

export const markOrderedSchema = z.object({
  circleId: z.string().uuid(),
  refillId: z.string().uuid(),
});

export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;
export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>;
export type RecordRefillInput = z.infer<typeof recordRefillSchema>;
export type MarkOrderedInput = z.infer<typeof markOrderedSchema>;

/** Form schemas for react-hook-form */
export const medFormSchema = z.object({
  name: nameField,
  strength: z.string().trim().max(50).optional(),
  form: z.string().trim().max(50).optional(),
  instructionsAsWritten: instructionsField,
  prescribedBy: z.string().trim().max(100).optional(),
  initialQuantity: z.number().int().min(0, 'Quantity cannot be negative'),
  dailyUsage: z.number().int().min(1, 'Daily usage must be at least 1'),
  assignedTo: z.string().optional(),
});

export type MedFormValues = z.infer<typeof medFormSchema>;

export const editMedFormSchema = z.object({
  name: nameField,
  strength: z.string().trim().max(50).optional(),
  form: z.string().trim().max(50).optional(),
  instructionsAsWritten: instructionsField,
  prescribedBy: z.string().trim().max(100).optional(),
  isActive: z.boolean(),
});

export type EditMedFormValues = z.infer<typeof editMedFormSchema>;

export const refillFormSchema = z.object({
  quantityAdded: z.number().int().min(1, 'Quantity added must be at least 1 unit'),
});

export type RefillFormValues = z.infer<typeof refillFormSchema>;
