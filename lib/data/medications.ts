import 'server-only';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { withUserTx } from '@/db/client';
import * as schema from '@/db/schema';
import type { CircleContext } from '@/lib/types/app';
import type {
  CreateMedicationInput,
  UpdateMedicationInput,
} from '@/lib/schemas/medications';

/**
 * lib/data/medications.ts
 * Owner: Member B
 * Data access layer for medications and refill countdown tracking.
 * All queries run under withUserTx for Postgres Row Level Security.
 */

const assignee = alias(schema.users, 'assignee');

export type MedicationItemView = {
  id: string;
  circleId: string;
  name: string;
  strength: string | null;
  form: string | null;
  instructionsAsWritten: string;
  prescribedBy: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  refill: {
    id: string;
    quantityOnHand: number;
    dailyUsage: number;
    lastRefilledOn: string | null;
    nextRefillDue: string | null;
    status: schema.Refill['status'];
    assignedTo: string | null;
    assigneeName: string | null;
  } | null;
};

export type MedicationListResult = {
  active: MedicationItemView[];
  past: MedicationItemView[];
};

export async function listMedications(ctx: CircleContext): Promise<MedicationListResult> {
  return withUserTx(ctx.userId, async (tx) => {
    const rows = await tx
      .select({
        id: schema.medications.id,
        circleId: schema.medications.circleId,
        name: schema.medications.name,
        strength: schema.medications.strength,
        form: schema.medications.form,
        instructionsAsWritten: schema.medications.instructionsAsWritten,
        prescribedBy: schema.medications.prescribedBy,
        isActive: schema.medications.isActive,
        createdAt: schema.medications.createdAt,
        updatedAt: schema.medications.updatedAt,
        refillId: schema.refills.id,
        quantityOnHand: schema.refills.quantityOnHand,
        dailyUsage: schema.refills.dailyUsage,
        lastRefilledOn: schema.refills.lastRefilledOn,
        nextRefillDue: schema.refills.nextRefillDue,
        refillStatus: schema.refills.status,
        assignedTo: schema.refills.assignedTo,
        assigneeName: assignee.fullName,
      })
      .from(schema.medications)
      .leftJoin(schema.refills, eq(schema.medications.id, schema.refills.medicationId))
      .leftJoin(assignee, eq(schema.refills.assignedTo, assignee.id))
      .where(
        and(
          eq(schema.medications.circleId, ctx.circleId),
          isNull(schema.medications.deletedAt),
        ),
      )
      .orderBy(desc(schema.medications.createdAt));

    const active: MedicationItemView[] = [];
    const past: MedicationItemView[] = [];

    for (const row of rows) {
      const item: MedicationItemView = {
        id: row.id,
        circleId: row.circleId,
        name: row.name,
        strength: row.strength,
        form: row.form,
        instructionsAsWritten: row.instructionsAsWritten,
        prescribedBy: row.prescribedBy,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        refill: row.refillId
          ? {
              id: row.refillId,
              quantityOnHand: row.quantityOnHand ?? 0,
              dailyUsage: row.dailyUsage ?? 1,
              lastRefilledOn: row.lastRefilledOn,
              nextRefillDue: row.nextRefillDue,
              status: row.refillStatus ?? 'ok',
              assignedTo: row.assignedTo,
              assigneeName: row.assigneeName,
            }
          : null,
      };

      if (row.isActive) {
        active.push(item);
      } else {
        past.push(item);
      }
    }

    // Sort active: urgent refills (overdue/due soon) first
    active.sort((a, b) => {
      const dateA = a.refill?.nextRefillDue || '9999-12-31';
      const dateB = b.refill?.nextRefillDue || '9999-12-31';
      return dateA.localeCompare(dateB);
    });

    return { active, past };
  });
}

/** Creates a new medication with initial refill tracking. */
export async function createMedication(
  ctx: CircleContext,
  input: CreateMedicationInput,
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);

  return withUserTx(ctx.userId, async (tx) => {
    const [medication] = await tx
      .insert(schema.medications)
      .values({
        circleId: ctx.circleId,
        name: input.name,
        strength: input.strength || null,
        form: input.form || null,
        instructionsAsWritten: input.instructionsAsWritten,
        prescribedBy: input.prescribedBy || null,
        startDate: input.startDate || today,
        endDate: input.endDate || null,
        isActive: true,
        createdBy: ctx.userId,
      })
      .returning({ id: schema.medications.id });

    await tx.insert(schema.refills).values({
      circleId: ctx.circleId,
      medicationId: medication.id,
      quantityOnHand: input.initialQuantity,
      dailyUsage: input.dailyUsage,
      lastRefilledOn: today,
      assignedTo: input.assignedTo || null,
    });

    return medication.id;
  });
}

/** Updates medication instructions or metadata. */
export async function updateMedication(
  ctx: CircleContext,
  input: UpdateMedicationInput,
): Promise<void> {
  await withUserTx(ctx.userId, async (tx) => {
    await tx
      .update(schema.medications)
      .set({
        name: input.name,
        strength: input.strength || null,
        form: input.form || null,
        instructionsAsWritten: input.instructionsAsWritten,
        prescribedBy: input.prescribedBy || null,
        isActive: input.isActive,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.medications.id, input.medicationId),
          eq(schema.medications.circleId, ctx.circleId),
        ),
      );
  });
}

/** Marks a refill as ordered (pharmacy order placed). */
export async function markRefillOrdered(
  ctx: CircleContext,
  refillId: string,
): Promise<void> {
  await withUserTx(ctx.userId, async (tx) => {
    await tx
      .update(schema.refills)
      .set({
        status: 'ordered',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.refills.id, refillId),
          eq(schema.refills.circleId, ctx.circleId),
        ),
      );
  });
}

/** Records new supply quantity received, updates lastRefilledOn, and recomputes countdown. */
export async function markRefillCompleted(
  ctx: CircleContext,
  refillId: string,
  quantityAdded: number,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  await withUserTx(ctx.userId, async (tx) => {
    const [current] = await tx
      .select({ quantityOnHand: schema.refills.quantityOnHand })
      .from(schema.refills)
      .where(
        and(
          eq(schema.refills.id, refillId),
          eq(schema.refills.circleId, ctx.circleId),
        ),
      )
      .limit(1);

    if (!current) {
      throw new Error('Refill tracker not found.');
    }

    const newQuantity = (current.quantityOnHand || 0) + quantityAdded;

    await tx
      .update(schema.refills)
      .set({
        quantityOnHand: newQuantity,
        lastRefilledOn: today,
        status: 'refilled',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.refills.id, refillId),
          eq(schema.refills.circleId, ctx.circleId),
        ),
      );
  });
}

/** Soft deletes a medication. */
export async function deleteMedication(
  ctx: CircleContext,
  medicationId: string,
): Promise<void> {
  await withUserTx(ctx.userId, async (tx) => {
    await tx
      .update(schema.medications)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.medications.id, medicationId),
          eq(schema.medications.circleId, ctx.circleId),
        ),
      );
  });
}
