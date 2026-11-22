import { requireCircleRole } from '@/lib/data/circle-context';
import { getCircleDashboard } from '@/lib/data/dashboard';
import { StatusBoardView } from '@/components/features/dashboard/status-board-view';

export default async function StatusBoardPage({
  params,
}: {
  params: Promise<{ circleId: string }>;
}) {
  const { circleId } = await params;
  const ctx = await requireCircleRole(circleId);
  const data = await getCircleDashboard(ctx);

  return (
    <StatusBoardView
      circleId={circleId}
      recipientName={ctx.recipientName}
      data={data}
    />
  );
}
