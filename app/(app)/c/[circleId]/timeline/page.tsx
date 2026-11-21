import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { requireCircleRole } from '@/lib/data/circle-context';
import { getCircleTimelineFeed } from '@/lib/data/timeline';
import { TimelineView } from '@/components/features/timeline/timeline-view';

interface TimelinePageProps {
  params: Promise<{ circleId: string }>;
}

export default async function TimelinePage({ params }: TimelinePageProps) {
  const { circleId } = await params;
  const ctx = await requireCircleRole(circleId, [
    'owner',
    'coordinator',
    'caregiver',
    'viewer',
    'care_recipient',
  ]);

  const initialFeed = await getCircleTimelineFeed(ctx, { limit: 20 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Circle Timeline"
        subtitle="Chronological feed of appointments, prescriptions, diagnostic reports, and family updates"
      />
      <TimelineView circleId={circleId} initialPage={initialFeed} />
    </div>
  );
}
