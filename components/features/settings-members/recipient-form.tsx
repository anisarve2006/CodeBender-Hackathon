'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateRecipientAction } from '@/app/(app)/c/[circleId]/settings/actions';
import { recipientFormSchema, type RecipientFormInput } from '@/lib/schemas/circles';
import type { RecipientDetails } from '@/lib/data/circles';

/**
 * components/features/settings-members/recipient-form.tsx
 * Owner: Member A
 * Care recipient editor. Medical fields (blood group, allergies, contact) are
 * stored exactly as entered; nothing is interpreted or advised.
 */

function toFormValues(details: RecipientDetails | null): RecipientFormInput {
  return {
    fullName: details?.fullName ?? '',
    dateOfBirth: details?.dateOfBirth ?? '',
    bloodGroup: details?.bloodGroup ?? '',
    allergies: details?.allergies.join(', ') ?? '',
    primaryContactName: details?.emergencyContact?.name ?? '',
    primaryContactPhone: details?.emergencyContact?.phone ?? '',
    primaryContactRelationship: details?.emergencyContact?.relationship ?? '',
  };
}

export function RecipientForm({
  circleId,
  details,
}: {
  circleId: string;
  details: RecipientDetails | null;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const form = useForm<RecipientFormInput>({
    resolver: zodResolver(recipientFormSchema),
    defaultValues: toFormValues(details),
  });
  const errors = form.formState.errors;

  async function onSubmit(values: RecipientFormInput) {
    setPending(true);
    const result = await updateRecipientAction({ circleId, ...values });
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Care recipient saved');
    form.reset(values);
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="rec-fullName">Full name</Label>
          <Input id="rec-fullName" className="min-h-11" aria-invalid={errors.fullName ? true : undefined} {...form.register('fullName')} />
          {errors.fullName && <p className="text-xs text-red-700 dark:text-red-400">{errors.fullName.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rec-dob">Date of birth</Label>
          <Input id="rec-dob" type="date" className="min-h-11" aria-invalid={errors.dateOfBirth ? true : undefined} {...form.register('dateOfBirth')} />
          {errors.dateOfBirth && <p className="text-xs text-red-700 dark:text-red-400">{errors.dateOfBirth.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rec-blood">Blood group</Label>
          <Input id="rec-blood" placeholder="As written on records" className="min-h-11" aria-invalid={errors.bloodGroup ? true : undefined} {...form.register('bloodGroup')} />
          {errors.bloodGroup && <p className="text-xs text-red-700 dark:text-red-400">{errors.bloodGroup.message}</p>}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="rec-allergies">Allergies</Label>
          <Textarea id="rec-allergies" rows={3} placeholder="Separate with commas, e.g. penicillin, latex" {...form.register('allergies')} />
          {errors.allergies && <p className="text-xs text-red-700 dark:text-red-400">{errors.allergies.message}</p>}
        </div>

        <fieldset className="space-y-4 rounded-md border p-4 sm:col-span-2">
          <legend className="px-1 text-sm font-medium">Primary contact (optional)</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="rec-contact-name">Name</Label>
              <Input id="rec-contact-name" className="min-h-11" {...form.register('primaryContactName')} />
              {errors.primaryContactName && <p className="text-xs text-red-700 dark:text-red-400">{errors.primaryContactName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-contact-phone">Phone</Label>
              <Input id="rec-contact-phone" type="tel" className="min-h-11" {...form.register('primaryContactPhone')} />
              {errors.primaryContactPhone && <p className="text-xs text-red-700 dark:text-red-400">{errors.primaryContactPhone.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-contact-rel">Relationship</Label>
              <Input id="rec-contact-rel" placeholder="e.g. daughter" className="min-h-11" {...form.register('primaryContactRelationship')} />
              {errors.primaryContactRelationship && <p className="text-xs text-red-700 dark:text-red-400">{errors.primaryContactRelationship.message}</p>}
            </div>
          </div>
        </fieldset>
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="min-h-11" disabled={pending}>
          {pending ? 'Saving…' : 'Save care recipient'}
        </Button>
      </div>
    </form>
  );
}
