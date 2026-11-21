'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateCircleInfoAction } from '@/app/(app)/c/[circleId]/settings/actions';
import { circleNameSchema } from '@/lib/schemas/members';

/**
 * components/features/settings-members/circle-info-form.tsx
 * Owner: Member A
 * Renames the circle. Owners and coordinators only (the action enforces it too).
 */

type NameValues = { name: string };
const nameFormSchema = circleNameSchema.pick({ name: true });

export function CircleInfoForm({ circleId, initialName }: { circleId: string; initialName: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const form = useForm<NameValues>({
    resolver: zodResolver(nameFormSchema),
    defaultValues: { name: initialName },
  });
  const errors = form.formState.errors;

  async function onSubmit(values: NameValues) {
    setPending(true);
    const result = await updateCircleInfoAction({ circleId, name: values.name });
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Circle name saved');
    form.reset({ name: values.name });
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="circle-name">Circle name</Label>
        <Input
          id="circle-name"
          className="min-h-11"
          aria-invalid={errors.name ? true : undefined}
          {...form.register('name')}
        />
        {errors.name && <p className="text-xs text-red-700 dark:text-red-400">{errors.name.message}</p>}
      </div>
      <div className="flex justify-end">
        <Button type="submit" className="min-h-11" disabled={pending}>
          {pending ? 'Saving…' : 'Save name'}
        </Button>
      </div>
    </form>
  );
}
