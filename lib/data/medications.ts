import 'server-only';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { withUserTx } from '@/db/client';
import * as schema from '@/db/schema';
import type { CircleContext } from '@/lib/types/app';
import { requireCircleRole } from '@/lib/data/circle-context';
import { bumpCircleVersion } from '@/lib/live/version';
import type { CreateMedicationInput, UpdateMedicationInput } from '@/lib/schemas/medications';
import { computeRefillStatus, nextRefillDueFrom, todayIsoDate } from '@/lib/utils/refill-math';

/**
 * Medicines and their refill countdowns. Owner: Member B.
 * instructionsAsWritten is stored and returned verbatim.
 */

const medicationColumns = {
  id: schema.medications.id,
  name: schema.medications.name,
  strength: schema.medications.strength,
  form: schema.medications.form,
  instructionsAsWritten: schema.medications.instructionsAsWritten,
  prescribedBy: schema.medications.prescribedBy,
  startDate: schema.medications.startDate,
  endDate: schema.medications.endDate,
  isActive: schema.medications.isActive,
  updatedAt: schema.medications.updatedAt,
  refillId: schema.refills.id,
  quantityOnHand: schema.refills.quantityOnHand,
  dailyUsage: schema.refills.dailyUsage,
  lastRefilledOn: schema.refills.lastRefilledOn,
  nextRefillDue: schema.refills.nextRefillDue,
  refillStatus: schema.refills.status,
};

/** Active medicines, sorted by next refill due (earliest first; medicines with no due date go last). */
export async function getActiveMedications(circleId: string) {
  const ctx = await requireCircleRole(circleId);

  return withUserTx(ctx.userId, (tx) =>
    tx
      .select(medicationColumns)
      .from(schema.medications)
      .leftJoin(schema.refills, eq(schema.refills.medicationId, schema.medications.id))
      .where(
        and(
          eq(schema.medications.circleId, circleId),
          eq(schema.medications.isActive, true),
          isNull(schema.medications.deletedAt),
        ),
      )
      .orderBy(asc(schema.refills.nextRefillDue), asc(schema.medications.name)),
  );
}

/** Inactive (stopped or completed) medicines, most recently changed first. */
export async function getPastMedications(circleId: string) {
  const ctx = await requireCircleRole(circleId);

  return withUserTx(ctx.userId, (tx) =>
    tx
      .select(medicationColumns)
      .from(schema.medications)
      .leftJoin(schema.refills, eq(schema.refills.medicationId, schema.medications.id))
      .where(
        and(
          eq(schema.medications.circleId, circleId),
          eq(schema.medications.isActive, false),
          isNull(schema.medications.deletedAt),
        ),
      )
      .orderBy(desc(schema.medications.updatedAt)),
  );
}

/**
 * Creates the medicine and its refill row in one transaction.
 * The initial countdown comes only from initialQuantity and dailyUsage.
 */
export async function createMedicationWithRefill(
  ctx: CircleContext,
  input: CreateMedicationInput,
): Promise<schema.Medication> {
  const today = todayIsoDate();

  const medication = await withUserTx(ctx.userId, async (tx) => {
    const [row] = await tx
      .insert(schema.medications)
      .values({
        circleId: ctx.circleId,
        name: input.name,
        strength: input.strength,
        form: input.form,
        instructionsAsWritten: input.instructionsAsWritten,
        prescribedBy: input.prescribedBy,
        startDate: input.startDate,
        endDate: input.endDate,
        createdBy: ctx.userId,
      })
      .returning();

    await tx.insert(schema.refills).values({
      circleId: ctx.circleId,
      medicationId: row.id,
      quantityOnHand: input.initialQuantity,
      dailyUsage: input.dailyUsage,
      lastRefilledOn: null,
      nextRefillDue: nextRefillDueFrom(today, input.initialQuantity, input.dailyUsage),
      status: computeRefillStatus(input.initialQuantity, input.dailyUsage),
    });

    return row;
  });

  await bumpCircleVersion(ctx.circleId);
  return medication;
}

/**
 * Updates the medicine details (name, strength, verbatim instructions, dates, active flag).
 * Quantity and daily usage are not changed here.
 */
export async function updateMedication(
  ctx: CircleContext,
  id: string,
  input: Omit<UpdateMedicationInput, 'id' | 'circleId'>,
): Promise<schema.Medication> {
  const changes: Partial<schema.NewMedication> = { updatedAt: new Date() };
  if (input.name !== undefined) changes.name = input.name;
  if (input.strength !== undefined) changes.strength = input.strength;
  if (input.form !== undefined) changes.form = input.form;
  if (input.instructionsAsWritten !== undefined) {
    changes.instructionsAsWritten = input.instructionsAsWritten;
  }
  if (input.prescribedBy !== undefined) changes.prescribedBy = input.prescribedBy;
  if (input.startDate !== undefined) changes.startDate = input.startDate;
  if (input.endDate !== undefined) changes.endDate = input.endDate;
  if (input.isActive !== undefined) changes.isActive = input.isActive;

  const updated = await withUserTx(ctx.userId, async (tx) => {
    const [row] = await tx
      .update(schema.medications)
      .set(changes)
      .where(
        and(
          eq(schema.medications.id, id),
          eq(schema.medications.circleId, ctx.circleId),
          isNull(schema.medications.deletedAt),
        ),
      )
      .returning();
    return row;
  });

  if (!updated) {
    throw new Error('Medicine not found.');
  }

  await bumpCircleVersion(ctx.circleId);
  return updated;
}
