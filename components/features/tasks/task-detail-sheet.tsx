'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { can } from '@/lib/utils/rbac';
import { formatDateTime, formatRelative } from '@/lib/utils/dates';
import type { ActionResult, CircleRole } from '@/lib/types/app';
import {
  claimTaskAction,
  commentTaskAction,
  completeTaskAction,
  loadTaskDetailAction,
  nudgeTaskAction,
  reassignTaskAction,
} from '@/app/(app)/c/[circleId]/tasks/actions';
import { nextRecurrenceDue } from './filters';
import { TIME_ZONE, initialsOf } from './task-card';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  RECURRENCE_LABELS,
  type MemberOption,
  type TaskDetail,
  type TaskView,
} from './types';

/**
 * components/features/tasks/task-detail-sheet.tsx
 * Owner: Member A
 * Task detail: description, comments, history and the action buttons.
 * Buttons are shown only when the viewer's role allows them. The server
 * action checks the same rules again.
 */

type TaskDetailSheetProps = {
  circleId: string;
  role: CircleRole;
  userId: string;
  task: TaskView | null;
  members: MemberOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
};

export function TaskDetailSheet({
  circleId,
  role,
  userId,
  task,
  members,
  open,
  onOpenChange,
  onChanged,
}: TaskDetailSheetProps) {
  const [detail, setDetail] = React.useState<TaskDetail | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [commentBody, setCommentBody] = React.useState('');

  React.useEffect(() => {
    if (!open || !task) return;
    let cancelled = false;
    loadTaskDetailAction({ circleId, taskId: task.id }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setDetail(result.data);
      } else {
        setLoadError(result.error);
      }
    });
    return () => {
      cancelled = true;
      // Reset here (cleanup, not the effect body) so the next task starts in the loading state.
      setDetail(null);
      setLoadError(null);
    };
  }, [open, task, circleId]);

  if (!task) return null;

  const isOpenTask = task.status === 'todo' || task.status === 'in_progress';
  const isDone = task.status === 'done';
  const canClaim = can(role, 'claim_tasks') && isOpenTask && task.assignedTo === null;
  const canComplete =
    can(role, 'claim_tasks') &&
    isOpenTask &&
    (role !== 'caregiver' || task.assignedTo === userId);
  const canReassign = can(role, 'assign_tasks_to_others') && isOpenTask;
  const canNudge =
    can(role, 'claim_tasks') && isOpenTask && task.assignedTo !== null && task.assignedTo !== userId;
  const canComment = can(role, 'claim_tasks');
  const nextDue = isOpenTask ? nextRecurrenceDue(task.dueAt, task.recurrenceRule) : null;
  const repeats = task.recurrenceRule && task.recurrenceRule !== 'none';
  const linkHref =
    task.linkedEntityType === 'appointment'
      ? `/c/${circleId}/appointments`
      : task.linkedEntityType === 'medication' || task.linkedEntityType === 'refill'
        ? `/c/${circleId}/meds`
        : null;

  async function run(action: () => Promise<ActionResult<unknown>>, successMessage: string) {
    setBusy(true);
    try {
      const result = await action();
      if (result.ok) {
        toast.success(successMessage);
        onChanged();
        return true;
      }
      toast.error(result.error);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleReassign(formData: FormData) {
    const value = String(formData.get('assignedTo') ?? '');
    await run(
      () =>
        reassignTaskAction({
          circleId,
          taskId: task!.id,
          assignedTo: value || null,
        }),
      'Assignee updated',
    );
  }

  async function handleComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await run(
      () => commentTaskAction({ circleId, taskId: task!.id, body: commentBody }),
      'Comment posted',
    );
    if (ok) setCommentBody('');
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="pr-6 leading-snug">{task.title}</SheetTitle>
          <SheetDescription>
            {CATEGORY_LABELS[task.category] ?? 'Other'} · {PRIORITY_LABELS[task.priority] ?? 'Normal priority'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-6 px-1 pb-6">
          {task.description && (
            <p className="whitespace-pre-line text-sm">{task.description}</p>
          )}

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Due</dt>
              <dd>{task.dueAt ? formatDateTime(task.dueAt, TIME_ZONE, 'd MMM yyyy, p') : 'No due date'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Assigned to</dt>
              <dd className="flex items-center gap-2">
                {task.assigneeName && (
                  <span
                    aria-hidden="true"
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                  >
                    {initialsOf(task.assigneeName)}
                  </span>
                )}
                {task.assigneeName ?? 'Unassigned'}
              </dd>
            </div>
            {repeats && (
              <div>
                <dt className="text-xs text-muted-foreground">Repeats</dt>
                <dd>
                  {RECURRENCE_LABELS[task.recurrenceRule as string]}
                  {nextDue && (
                    <span className="block text-xs text-muted-foreground">
                      Next {formatRelative(nextDue)}
                    </span>
                  )}
                </dd>
              </div>
            )}
            {linkHref && (
              <div>
                <dt className="text-xs text-muted-foreground">Linked</dt>
                <dd>
                  <Link href={linkHref} className="underline underline-offset-4">
                    {task.linkedEntityType === 'appointment' ? 'Appointment' : 'Medicines and refills'}
                  </Link>
                </dd>
              </div>
            )}
            {isDone && task.completedAt && (
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Completed</dt>
                <dd>
                  {formatRelative(task.completedAt)}
                  {task.completedByName ? ` by ${task.completedByName}` : ''}
                </dd>
              </div>
            )}
          </dl>

          {(canClaim || canComplete || canNudge) && (
            <div className="flex flex-wrap gap-2">
              {canClaim && (
                <Button
                  type="button"
                  className="min-h-11"
                  disabled={busy}
                  onClick={() => run(() => claimTaskAction({ circleId, taskId: task.id }), 'Task claimed')}
                >
                  I&apos;ll take it
                </Button>
              )}
              {canComplete && (
                <Button
                  type="button"
                  variant="default"
                  className="min-h-11"
                  disabled={busy}
                  onClick={() => run(() => completeTaskAction({ circleId, taskId: task.id }), 'Marked done')}
                >
                  Mark done
                </Button>
              )}
              {canNudge && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={busy}
                  onClick={() => run(() => nudgeTaskAction({ circleId, taskId: task.id }), 'Nudge sent')}
                >
                  Nudge
                </Button>
              )}
            </div>
          )}

          {canReassign && (
            <form
              action={handleReassign}
              key={`${task.id}-${task.assignedTo ?? 'none'}`}
              className="space-y-2"
            >
              <Label htmlFor="task-assignee">Change assignee</Label>
              <div className="flex gap-2">
                <select
                  id="task-assignee"
                  name="assignedTo"
                  defaultValue={task.assignedTo ?? ''}
                  className="min-h-11 flex-1 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.fullName}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="outline" className="min-h-11" disabled={busy}>
                  Save
                </Button>
              </div>
            </form>
          )}

          <section aria-labelledby="task-comments-heading" className="space-y-3">
            <h3 id="task-comments-heading" className="text-sm font-semibold">
              Comments
            </h3>
            {loadError && <p className="text-sm text-red-700 dark:text-red-400">{loadError}</p>}
            {!detail && !loadError && <p className="text-sm text-muted-foreground">Loading…</p>}
            {detail && detail.comments.length === 0 && (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            )}
            {detail?.comments.map((comment) => (
              <div key={comment.id} className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="whitespace-pre-line">{comment.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {comment.authorName ?? 'Someone'} · {formatRelative(comment.createdAt)}
                </p>
              </div>
            ))}

            {canComment && (
              <form onSubmit={handleComment} className="space-y-2">
                <Label htmlFor="task-comment" className="sr-only">
                  Add a comment
                </Label>
                <Textarea
                  id="task-comment"
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  maxLength={1000}
                  placeholder="Add a comment"
                  rows={2}
                />
                <Button type="submit" className="min-h-11" disabled={busy || commentBody.trim().length === 0}>
                  Post comment
                </Button>
              </form>
            )}
          </section>

          <section aria-labelledby="task-history-heading" className="space-y-3">
            <h3 id="task-history-heading" className="text-sm font-semibold">
              History
            </h3>
            {detail && detail.history.length === 0 && (
              <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
            )}
            <ol className="space-y-2 text-sm">
              {detail?.history.map((entry) => (
                <li key={entry.id} className="border-l-2 pl-3">
                  <p>{entry.summary}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.actorName ?? 'System'} · {formatRelative(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
