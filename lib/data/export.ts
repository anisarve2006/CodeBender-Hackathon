import 'server-only';
import { eq } from 'drizzle-orm';
import { withUserTx } from '@/db/client';
import * as schema from '@/db/schema';
import { canViewDocument, getDocumentBlobRef } from '@/lib/data/documents';
import { createSignedDocumentUrl } from '@/lib/utils/blob';

export type CircleExportData = {
  exportedAt: string;
  circle: {
    id: string;
    name: string;
    createdAt: Date;
    careRecipient: {
      fullName: string;
      dateOfBirth: string | null;
      bloodGroup: string | null;
      allergies: string[] | null;
      emergencyContact: Record<string, unknown> | null;
      primaryDoctor: Record<string, unknown> | null;
      notes: string | null;
    } | null;
    members: Array<{
      userId: string;
      role: string;
      joinedAt: Date;
    }>;
  };
  appointments: schema.Appointment[];
  medications: Array<{
    medication: schema.Medication;
    refill: schema.Refill | null;
  }>;
  tasks: schema.Task[];
  updates: schema.Update[];
  documents: Array<{
    metadata: schema.Document;
    downloadUrl?: string;
  }>;
};

export async function getCircleExportData(
  circleId: string,
  userId: string,
): Promise<CircleExportData> {
  return withUserTx(userId, async (tx) => {
    // 1. Circle & recipient
    const circleRows = await tx
      .select()
      .from(schema.careCircles)
      .where(eq(schema.careCircles.id, circleId))
      .limit(1);

    if (circleRows.length === 0) {
      throw new Error('Circle not found');
    }

    const recipientRows = await tx
      .select()
      .from(schema.careRecipients)
      .where(eq(schema.careRecipients.circleId, circleId))
      .limit(1);

    const membersRows = await tx
      .select({
        userId: schema.circleMembers.userId,
        role: schema.circleMembers.role,
        joinedAt: schema.circleMembers.joinedAt,
      })
      .from(schema.circleMembers)
      .where(eq(schema.circleMembers.circleId, circleId));

    // 2. Appointments
    const appointmentsRows = await tx
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.circleId, circleId));

    // 3. Medications & refills
    const medsRows = await tx
      .select()
      .from(schema.medications)
      .where(eq(schema.medications.circleId, circleId));

    const refillsRows = await tx
      .select()
      .from(schema.refills)
      .where(eq(schema.refills.circleId, circleId));

    const refillMap = new Map(refillsRows.map((r) => [r.medicationId, r]));

    const medications = medsRows.map((m) => ({
      medication: m,
      refill: refillMap.get(m.id) || null,
    }));

    // 4. Tasks
    const tasksRows = await tx
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.circleId, circleId));

    // 5. Updates
    const updatesRows = await tx
      .select()
      .from(schema.updates)
      .where(eq(schema.updates.circleId, circleId));

    // 6. Documents
    const docsRows = await tx
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.circleId, circleId));

    const docsWithUrls = await Promise.all(
      docsRows.map(async (doc) => {
        try {
          const allowed = await canViewDocument(userId, doc.id);
          if (allowed) {
            const blobRef = await getDocumentBlobRef(userId, doc.id);
            if (blobRef) {
              const downloadUrl = await createSignedDocumentUrl(blobRef.blobPathname);
              return { metadata: doc, downloadUrl };
            }
          }
          return { metadata: doc };
        } catch {
          return { metadata: doc };
        }
      }),
    );

    return {
      exportedAt: new Date().toISOString(),
      circle: {
        id: circleRows[0].id,
        name: circleRows[0].name,
        createdAt: circleRows[0].createdAt,
        careRecipient: recipientRows[0] || null,
        members: membersRows,
      },
      appointments: appointmentsRows,
      medications,
      tasks: tasksRows,
      updates: updatesRows,
      documents: docsWithUrls,
    };
  });
}
