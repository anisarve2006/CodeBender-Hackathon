'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CircleRole } from '@/lib/types/app';
import {
  createTaskAction,
  getTaskFormOptionsAction,
} from '@/app/(app)/c/[circleId]/tasks/actions';
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  RECURRENCE_RULES,
  createTaskSchemaFor,
  defaultDueLocal,
  istLocalToIso,
  taskFormSchema,
  type TaskFormValues,
} from '@/lib/schemas/tasks';
import { CATEGORY_LABELS, PRIORITY_LABELS, RECURRENCE_LABELS, type MemberOption } from './types';

/**
 * components/features/tasks/quick-add-task.tsx
 * Owner: Member A
 * Create-task dialog (opened from the Quick Add button and the Tasks page).
 * Defaults: tomorrow 10:00 India time, normal priority. Caregivers are fixed to
 * themselves; the server action enforces the same rule.
 */

interface QuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  circleId: string;
}

type FormOptions = { role: CircleRole; userId: string; members: MemberOption[] };

const selectClass =
  'min-h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function emptyValues(): TaskFormValues {
  return {
    title: '',
    description: '',
    category: 'other',
    priority: 'normal',
    dueLocal: defaultDueLocal(),
    assignedTo: '',
    recurrenceRule: 'none',
  };
}

export function QuickAddTaskDialog({ open, onOpenChange, circleId }: QuickAddDialogProps) {
  const router = useRouter();
  const [options, setOptions] = React.useState<FormOptions | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: emptyValues(),
  });

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getTaskFormOptionsAction({ circleId }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setOptions(result.data);
        setLoadError(null);
        if (result.data.role === 'caregiver') {
          form.setValue('assignedTo', result.data.userId);
        }
      } else {
        setLoadError(result.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, circleId, form]);

  async function onSubmit(values: TaskFormValues) {
    const payload = {
      circleId,
      title: values.title,
      description: values.description || undefined,
      category: values.category,
      priority: values.priority,
      dueAt: istLocalToIso(values.dueLocal),
      assignedTo: values.assignedTo || null,
      recurrenceRule: values.recurrenceRule,
    };

    // Same caregiver rule the server action enforces, checked before the round trip.
    if (options) {
      const check = createTaskSchemaFor(options.role, options.userId).safeParse(payload);
      if (!check.success) {
        form.setError('assignedTo', {
          message: check.error.issues[0]?.message ?? 'Check who this task is assigned to.',
        });
        return;
      }
    }

    setSubmitting(true);
    const result = await createTaskAction(payload);
    setSubmitting(false);

    if (!result.ok) {
      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (field in emptyValues() && messages?.[0]) {
          form.setError(field as keyof TaskFormValues, { message: messages[0] });
        }
      });
      toast.error(result.error);
      return;
    }

    toast.success('Task added');
    form.reset(emptyValues());
    onOpenChange(false);
    router.refresh();
  }

  const errors = form.formState.errors;
  const isCaregiver = options?.role === 'caregiver';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>Quickly assign or track a caregiving task.</DialogDescription>
        </DialogHeader>

        {loadError && <p className="text-sm text-red-700 dark:text-red-400">{loadError}</p>}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              className="min-h-11"
              aria-invalid={errors.title ? true : undefined}
              {...form.register('title')}
            />
            {errors.title && <p className="text-xs text-red-700 dark:text-red-400">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-description">Details (optional)</Label>
            <Textarea id="task-description" rows={3} {...form.register('description')} />
            {errors.description && (
              <p className="text-xs text-red-700 dark:text-red-400">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-category">Category</Label>
              <select id="task-category" className={selectClass} {...form.register('category')}>
                {TASK_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {CATEGORY_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <select id="task-priority" className={selectClass} {...form.register('priority')}>
                {TASK_PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {PRIORITY_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-due">Due (India time)</Label>
            <Input
              id="task-due"
              type="datetime-local"
              className="min-h-11"
              aria-invalid={errors.dueLocal ? true : undefined}
              {...form.register('dueLocal')}
            />
            {errors.dueLocal && (
              <p className="text-xs text-red-700 dark:text-red-400">{errors.dueLocal.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-assignee">Assigned to</Label>
            {isCaregiver ? (
              <p className="min-h-11 rounded-md border bg-muted/40 px-3 py-2.5 text-sm">You</p>
            ) : (
              <select id="task-assignee" className={selectClass} {...form.register('assignedTo')}>
                <option value="">Unassigned</option>
                {options?.members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.fullName}
                  </option>
                ))}
              </select>
            )}
            {errors.assignedTo && (
              <p className="text-xs text-red-700 dark:text-red-400">{errors.assignedTo.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-recurrence">Repeats</Label>
            <select id="task-recurrence" className={selectClass} {...form.register('recurrenceRule')}>
              {RECURRENCE_RULES.map((value) => (
                <option key={value} value={value}>
                  {RECURRENCE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="min-h-11" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
