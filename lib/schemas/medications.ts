import { z } from 'zod';

export const createMedicationSchema = z.object({
  circleId: z.string().uuid(),
  name: z.string().min(2, 'Medication name is required').max(100),
  strength: z.string().max(40).optional(),
  form: z.string().max(40).optional(),
  instructionsAsWritten: z.string().min(2, 'Instructions as written on prescription required').max(500),
  prescribedBy: z.string().max(80).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  initialQuantity: z.number().int().min(0).default(0),
  dailyUsage: z.number().int().min(1).default(1),
});

export const updateMedicationSchema = createMedicationSchema.partial().extend({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
});

export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;
export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>;
