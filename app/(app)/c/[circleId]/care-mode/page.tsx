import { requireCircleRole } from '@/lib/data/circle-context';
import { getActiveMedications } from '@/lib/data/medications';
import { getAppointments } from '@/lib/data/appointments';
import { withUserTx } from '@/db/client';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { CareModeView } from '@/components/features/care-mode/care-mode-view';

export default async function CareModePage({
  params,
}: {
  params: Promise<{ circleId: string }>;
}) {
  const { circleId } = await params;
  const ctx = await requireCircleRole(circleId);

  // Fetch care recipient details using withUserTx
  const recipient = await withUserTx(ctx.userId, async (tx) => {
    return tx
      .select({
        fullName: schema.careRecipients.fullName,
        emergencyContact: schema.careRecipients.emergencyContact,
      })
      .from(schema.careRecipients)
      .where(eq(schema.careRecipients.circleId, circleId))
      .limit(1);
  });

  const [activeMeds, upcomingAppts] = await Promise.all([
    getActiveMedications(circleId),
    getAppointments(circleId, 'upcoming'),
  ]);

  const medications = activeMeds.map((m) => ({
    id: m.id,
    name: m.name,
    strength: m.strength,
    instructionsAsWritten: m.instructionsAsWritten,
    prescribedBy: m.prescribedBy,
  }));

  const nextAppt =
    upcomingAppts.length > 0
      ? {
          id: upcomingAppts[0].id,
          title: upcomingAppts[0].title,
          doctorName: upcomingAppts[0].doctorName,
          specialty: upcomingAppts[0].specialty,
          location: upcomingAppts[0].location,
          startsAt: upcomingAppts[0].startsAt,
          companionName: upcomingAppts[0].companionName,
        }
      : null;

  return (
    <CareModeView
      circleId={circleId}
      recipientName={recipient[0]?.fullName || ctx.recipientName}
      emergencyContact={recipient[0]?.emergencyContact || null}
      medications={medications}
      nextAppointment={nextAppt}
    />
  );
}
