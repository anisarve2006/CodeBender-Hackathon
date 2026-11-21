import { PageHeader } from '@/components/shared/PageHeader';
import { requireUser } from '@/lib/auth/session';
import { requireCircleRole } from '@/lib/data/circle-context';
import { TimelineFeed } from '@/components/features/timeline/timeline-feed';

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ circleId: string }>;
}) {
  const { circleId } = await params;
  const [, viewer] = await Promise.all([requireCircleRole(circleId), requireUser()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Care Timeline"
        subtitle="Chronological feed of appointments, prescriptions, reports, and updates"
      />

      <p className="text-sm text-muted-foreground">
        Family Care Hub organises information only and does not provide medical advice. Always
        consult a doctor.
      </p>

      <TimelineFeed circleId={circleId} timezone={viewer.timezone} />
    </div>
  );
}
