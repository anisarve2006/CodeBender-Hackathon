'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createCircleAction } from '@/app/(app)/onboarding/actions';
import { circleNameStepSchema, type CircleNameStepInput } from '@/lib/schemas/circles';
import { applyZodErrors } from './apply-zod-errors';

export type CreatedCircle = { id: string; name: string };

export function StepCircle({ onDone }: { onDone: (circle: CreatedCircle) => void }) {
  const form = useForm<CircleNameStepInput>({
    defaultValues: { name: '', consentConfirmed: false },
  });
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    const parsed = circleNameStepSchema.safeParse(values);
    if (!parsed.success) {
      applyZodErrors(form, parsed.error);
      return;
    }

    setServerError(null);
    setPending(true);
    const result = await createCircleAction(parsed.data);
    setPending(false);

    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    onDone({ id: result.data.circleId, name: parsed.data.name });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6" aria-labelledby="step-circle-title">
      <div className="space-y-1">
        <h2 id="step-circle-title" className="text-lg font-semibold">
          Name your care circle
        </h2>
        <p className="text-sm text-muted-foreground">
          The circle is the shared space for one care recipient and the family members helping
          them.
        </p>
      </div>

      {serverError && (
        <div role="alert" className="rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive">
          {serverError}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="circle-name">Circle name</Label>
        <Input
          id="circle-name"
          placeholder="e.g. Sharma family care"
          autoComplete="off"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'circle-name-error' : undefined}
          className="min-h-11"
          {...form.register('name')}
        />
        {errors.name && (
          <p id="circle-name-error" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="flex min-h-11 items-start gap-3 rounded-md border p-3">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 accent-primary"
            aria-invalid={!!errors.consentConfirmed}
            aria-describedby={errors.consentConfirmed ? 'consent-error' : undefined}
            {...form.register('consentConfirmed')}
          />
          <span className="text-sm">
            I confirm that the care recipient, or their legal representative, agrees to their
            information being stored in Kinly for care coordination only. Data is stored
            in Singapore (DPDP Act 2023).
          </span>
        </label>
        {errors.consentConfirmed && (
          <p id="consent-error" className="text-sm text-destructive">
            {errors.consentConfirmed.message}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="lg" className="min-h-11" disabled={pending}>
          {pending ? 'Creating circle...' : 'Continue'}
        </Button>
      </div>
    </form>
  );
}
