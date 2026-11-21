import { PageHeader } from '@/components/shared/PageHeader';
import { AppointmentsView } from '@/components/features/appointments/appointments-view';
import { requireCircleRole } from '@/lib/data/circle-context';
import { listAppointments } from '@/lib/data/appointments';
import { listCircleMembers } from '@/lib/data/members';

/**
 * Doctor Appointments Page
 * Owner: Member B
 * Renders upcoming and past appointments with calendar export and coordination tasks.
 */
export default async function AppointmentsPage({
  params,
}: {
  params: Promise<{ circleId: string }>;
}) {
  const { circleId } = await params;
  const ctx = await requireCircleRole(circleId);

  const [upcoming, past, rawMembers] = await Promise.all([
    listAppointments(ctx, 'upcoming'),
    listAppointments(ctx, 'past'),
    listCircleMembers(circleId, ctx.userId),
  ]);

  const members = rawMembers.map((m) => ({
    userId: m.userId,
    fullName: m.fullName,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor Appointments"
        subtitle="Upcoming doctor visits, clinic locations, reminders and consultation history"
      />
      <AppointmentsView
        circleId={circleId}
        role={ctx.role}
        upcoming={upcoming}
        past={past}
        members={members}
      />
    </div>
  );
}
