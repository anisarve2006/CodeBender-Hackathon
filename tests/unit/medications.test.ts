import { describe, it, expect } from 'vitest';
import {
  createMedicationSchema,
  recordRefillSchema,
  updateMedicationSchema,
} from '@/lib/schemas/medications';

describe('Medications & Refill Zod Schemas', () => {
  const circleId = 'a0000000-0000-4000-8000-000000000001';

  it('validates a complete medication input with initial refill settings', () => {
    const result = createMedicationSchema.safeParse({
      circleId,
      name: 'Amlodipine',
      strength: '5 mg',
      form: 'Tablets',
      instructionsAsWritten: '1 tablet once daily in morning after food',
      prescribedBy: 'Dr. S. Mehta',
      initialQuantity: 30,
      dailyUsage: 1,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Amlodipine');
      expect(result.data.initialQuantity).toBe(30);
      expect(result.data.dailyUsage).toBe(1);
    }
  });

  it('rejects empty or whitespace instructions', () => {
    const result = createMedicationSchema.safeParse({
      circleId,
      name: 'Metformin',
      instructionsAsWritten: '   ',
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid or zero daily usage', () => {
    const result = createMedicationSchema.safeParse({
      circleId,
      name: 'Metformin',
      instructionsAsWritten: '1 tablet daily',
      dailyUsage: 0,
    });

    expect(result.success).toBe(false);
  });

  it('validates recording a refill addition', () => {
    const refillId = 'a0000000-0000-4000-8000-000000000003';

    const valid = recordRefillSchema.safeParse({
      circleId,
      refillId,
      quantityAdded: 30,
    });
    expect(valid.success).toBe(true);

    const invalid = recordRefillSchema.safeParse({
      circleId,
      refillId,
      quantityAdded: 0,
    });
    expect(invalid.success).toBe(false);
  });

  it('validates updating medication active status', () => {
    const medicationId = 'a0000000-0000-4000-8000-000000000004';

    const result = updateMedicationSchema.safeParse({
      circleId,
      medicationId,
      name: 'Amlodipine Besylate',
      instructionsAsWritten: 'Discontinued by cardiologist',
      isActive: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(false);
    }
  });
});
