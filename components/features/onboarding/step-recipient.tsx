'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { saveRecipientAction } from '@/app/(app)/onboarding/actions';
import { recipientFormSchema, type RecipientFormInput } from '@/lib/schemas/circles';
import { applyZodErrors } from './apply-zod-errors';

const EMPTY_RECIPIENT: RecipientFormInput = {
  fullName: '',
  dateOfBirth: '',
  bloodGroup: '',
  allergies: '',
  primaryContactName: '',
  primaryContactPhone: '',
  primaryContactRelationship: '',
};

/**
 * Medical fields (blood group, allergies) are stored as entered.
 * The app does not interpret or advise on them.
 */
export function StepRecipient({
  circleId,
  circleName,
  onDone,
}: {
  circleId: string;
  circleName: string;
  onDone: () => void;
}) {
  const form = useForm<RecipientFormInput>({ defaultValues: EMPTY_RECIPIENT });
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    const parsed = recipientFormSchema.safeParse(values);
    if (!parsed.success) {
      applyZodErrors(form, parsed.error);
      return;
    }

    setServerError(null);
    setPending(true);
    const result = await saveRecipientAction({ circleId, ...parsed.data });
    setPending(false);

    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    onDone();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6" aria-labelledby="step-recipient-title">
      <div className="space-y-1">
        <h2 id="step-recipient-title" className="text-lg font-semibold">
          Tell us about the care recipient
        </h2>
        <p className="text-sm text-muted-foreground">
          Details for <span className="font-medium">{circleName}</span>. Enter what is on your
          records. You can edit these later in settings.
        </p>
      </div>

      {serverError && (
        <div role="alert" className="rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive">
          {serverError}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            autoComplete="off"
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? 'fullName-error' : undefined}
            className="min-h-11"
            {...form.register('fullName')}
          />
          {errors.fullName && (
            <p id="fullName-error" className="text-sm text-destructive">
              {errors.fullName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input
            id="dateOfBirth"
            type="date"
            aria-invalid={!!errors.dateOfBirth}
            aria-describedby={errors.dateOfBirth ? 'dateOfBirth-error' : undefined}
            className="min-h-11"
            {...form.register('dateOfBirth')}
          />
          {errors.dateOfBirth && (
            <p id="dateOfBirth-error" className="text-sm text-destructive">
              {errors.dateOfBirth.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bloodGroup">Blood group</Label>
          <Input
            id="bloodGroup"
            placeholder="As written on records"
            autoComplete="off"
            aria-invalid={!!errors.bloodGroup}
            aria-describedby={errors.bloodGroup ? 'bloodGroup-error' : undefined}
            className="min-h-11"
            {...form.register('bloodGroup')}
          />
          {errors.bloodGroup && (
            <p id="bloodGroup-error" className="text-sm text-destructive">
              {errors.bloodGroup.message}
            </p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="allergies">Allergies</Label>
          <Textarea
            id="allergies"
            rows={3}
            placeholder="Separate with commas, e.g. penicillin, latex"
            aria-invalid={!!errors.allergies}
            aria-describedby={errors.allergies ? 'allergies-error' : undefined}
            {...form.register('allergies')}
          />
          {errors.allergies && (
            <p id="allergies-error" className="text-sm text-destructive">
              {errors.allergies.message}
            </p>
          )}
        </div>

        <fieldset className="space-y-4 sm:col-span-2 rounded-md border p-4">
          <legend className="px-1 text-sm font-medium">Primary contact (optional)</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="primaryContactName">Name</Label>
              <Input
                id="primaryContactName"
                autoComplete="off"
                aria-invalid={!!errors.primaryContactName}
                className="min-h-11"
                {...form.register('primaryContactName')}
              />
              {errors.primaryContactName && (
                <p className="text-sm text-destructive">{errors.primaryContactName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryContactPhone">Phone</Label>
              <Input
                id="primaryContactPhone"
                type="tel"
                autoComplete="off"
                aria-invalid={!!errors.primaryContactPhone}
                className="min-h-11"
                {...form.register('primaryContactPhone')}
              />
              {errors.primaryContactPhone && (
                <p className="text-sm text-destructive">{errors.primaryContactPhone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryContactRelationship">Relationship</Label>
              <Input
                id="primaryContactRelationship"
                placeholder="e.g. daughter"
                autoComplete="off"
                aria-invalid={!!errors.primaryContactRelationship}
                className="min-h-11"
                {...form.register('primaryContactRelationship')}
              />
              {errors.primaryContactRelationship && (
                <p className="text-sm text-destructive">
                  {errors.primaryContactRelationship.message}
                </p>
              )}
            </div>
          </div>
        </fieldset>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="lg" className="min-h-11" disabled={pending}>
          {pending ? 'Saving...' : 'Save and continue'}
        </Button>
      </div>
    </form>
  );
}
