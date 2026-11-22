/**
 * Tasks page (server component)
 * Owner: Member A
 * Loads open tasks, the first page of completed tasks and the member list under
 * the caller's RLS context, then hands them to the client view.
 */

import { PageHeader } from '@/components/shared/PageHeader';
import { TasksView } from '@/components/features/tasks/tasks-view';
import { requireCircleRole } from '@/lib/data/circle-context';
import { listCircleMembers } from '@/lib/data/members';
import { listDoneTasks, listOpenTasks } from '@/lib/data/tasks';

export default async function TasksPage({
  params,
}: {
  params: Promise<{ circleId: string }>;
}) {
  const { circleId } = await params;
  const ctx = await requireCircleRole(circleId);

  const [openTasks, donePage, members] = await Promise.all([
    listOpenTasks(ctx),
    listDoneTasks(ctx),
    listCircleMembers(circleId, ctx.userId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Care Tasks"
        subtitle="Who owns what, what is overdue, and what is already done"
      />
      <TasksView
        circleId={circleId}
        role={ctx.role}
        userId={ctx.userId}
        openTasks={openTasks}
        donePage={donePage}
        members={members}
      />
    </div>
  );
}
