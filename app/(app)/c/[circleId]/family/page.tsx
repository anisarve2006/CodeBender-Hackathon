/**
 * Family page (server component)
 * Owner: Member A
 * Loads the roster, both who-did-what windows (7 and 30 days, Asia/Kolkata) and the
 * latest updates under the caller's RLS context, then hands them to the client view.
 */

import { PageHeader } from '@/components/shared/PageHeader';
import { FamilyView } from '@/components/features/family/family-view';
import { requireCircleRole } from '@/lib/data/circle-context';
import { listMemberRoster } from '@/lib/data/members';
import { whoDidWhat } from '@/lib/data/dashboard';
import { whoDidWhatWindow } from '@/lib/data/dashboard-window';
import { listUpdates } from '@/lib/data/updates';

export default async function FamilyPage({
  params,
}: {
  params: Promise<{ circleId: string }>;
}) {
  const { circleId } = await params;
  const ctx = await requireCircleRole(circleId);

  const sevenWindow = whoDidWhatWindow(7);
  const thirtyWindow = whoDidWhatWindow(30);

  const [members, sevenDay, thirtyDay, updates] = await Promise.all([
    listMemberRoster(circleId, ctx.userId),
    whoDidWhat(ctx, sevenWindow.from, sevenWindow.to),
    whoDidWhat(ctx, thirtyWindow.from, thirtyWindow.to),
    listUpdates(ctx),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Family Members & Updates"
        subtitle="Who is in the circle, who did what, and the latest family updates"
      />
      <FamilyView
        circleId={circleId}
        role={ctx.role}
        members={members}
        sevenDay={sevenDay}
        thirtyDay={thirtyDay}
        updates={updates}
      />
    </div>
  );
}
