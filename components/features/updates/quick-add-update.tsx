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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createUpdateAction } from '@/app/(app)/c/[circleId]/family/actions';
import {
  UPDATE_BODY_MAX,
  UPDATE_MOODS,
  UPDATE_MOOD_LABELS,
  updateFormSchema,
  type UpdateFormValues,
} from '@/lib/schemas/updates';
import { MOOD_ICONS } from './mood-display';

/**
 * components/features/updates/quick-add-update.tsx
 * Owner: Member A
 * Post a short family update with a mood. Viewers never see this dialog (the
 * caller hides the trigger) and the action rejects them too.
 */

interface QuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  circleId: string;
}

const DEFAULT_MOOD: UpdateFormValues['mood'] = 'okay';

export function QuickAddUpdateDialog({ open, onOpenChange, circleId }: QuickAddDialogProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<UpdateFormValues>({
    resolver: zodResolver(updateFormSchema),
    defaultValues: { body: '', mood: DEFAULT_MOOD },
  });

  const errors = form.formState.errors;

  async function onSubmit(values: UpdateFormValues) {
    setSubmitting(true);
    const result = await createUpdateAction({
      circleId,
      body: values.body,
      mood: values.mood,
    });
    setSubmitting(false);

    if (!result.ok) {
      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (field in form.getValues() && messages?.[0]) {
          form.setError(field as keyof UpdateFormValues, { message: messages[0] });
        }
      });
      toast.error(result.error);
      return;
    }

    toast.success('Update posted');
    form.reset({ body: '', mood: DEFAULT_MOOD });
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post Family Update</DialogTitle>
          <DialogDescription>Share a quick care update with family members.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="update-body">Update</Label>
            <Textarea
              id="update-body"
              rows={3}
              maxLength={UPDATE_BODY_MAX}
              aria-invalid={errors.body ? true : undefined}
              placeholder="A short note for the family"
              {...form.register('body')}
            />
            {errors.body && <p className="text-xs text-red-700 dark:text-red-400">{errors.body.message}</p>}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium leading-none">How is today?</legend>
            <div className="grid grid-cols-2 gap-2">
              {UPDATE_MOODS.map((value) => {
                const Icon = MOOD_ICONS[value];
                const id = `update-mood-${value}`;
                return (
                  <div key={value} className="relative">
                    <input
                      id={id}
                      type="radio"
                      value={value}
                      className="peer sr-only"
                      {...form.register('mood')}
                    />
                    <Label
                      htmlFor={id}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium peer-checked:border-primary peer-checked:bg-primary/10 peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      {UPDATE_MOOD_LABELS[value]}
                    </Label>
                  </div>
                );
              })}
            </div>
            {errors.mood && <p className="text-xs text-red-700 dark:text-red-400">{errors.mood.message}</p>}
          </fieldset>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="min-h-11" disabled={submitting}>
              {submitting ? 'Posting…' : 'Post update'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
