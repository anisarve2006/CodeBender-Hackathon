'use client';

import * as React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendInvitesAction, type SentInvitation } from '@/app/(app)/onboarding/actions';
import {
  cleanInviteRows,
  INVITABLE_ROLE_LABELS,
  INVITABLE_ROLES,
  inviteFormSchema,
  MAX_INVITE_ROWS,
  type InviteFormInput,
} from '@/lib/schemas/invitations';
import { applyZodErrors } from './apply-zod-errors';
import { InviteShareButtons } from './invite-share-buttons';

const EMPTY_ROW = { email: '', role: 'caregiver' as const };

/**
 * Invite rows are optional. Blank rows are ignored. Each sent invitation gets
 * share buttons. The link is shown once, to the person who sent it.
 */
export function StepInvites({
  circleId,
  circleName,
  onFinish,
  onBack,
}: {
  circleId: string;
  circleName: string;
  onFinish: () => void;
  onBack: () => void;
}) {
  const form = useForm<InviteFormInput>({
    defaultValues: { invites: [{ ...EMPTY_ROW }, { ...EMPTY_ROW }] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'invites' });
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [sent, setSent] = React.useState<SentInvitation[] | null>(null);
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    const parsed = inviteFormSchema.safeParse(values);
    if (!parsed.success) {
      applyZodErrors(form, parsed.error);
      return;
    }

    const invites = cleanInviteRows(parsed.data.invites);
    if (invites.length === 0) {
      onFinish();
      return;
    }

    setServerError(null);
    setPending(true);
    const result = await sendInvitesAction({ circleId, invites });
    setPending(false);

    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    setSent(result.data.invitations);
  });

  if (sent) {
    return (
      <div className="space-y-6" aria-labelledby="step-invites-sent-title">
        <div className="space-y-1">
          <h2 id="step-invites-sent-title" className="text-lg font-semibold">
            Invitations ready
          </h2>
          <p className="text-sm text-muted-foreground">
            We emailed each invitation. You can also share the link directly. Links expire in 72
            hours.
          </p>
        </div>
        <ul className="space-y-4">
          {sent.map((invitation) => (
            <li key={invitation.email} className="space-y-2 rounded-md border p-4">
              <p className="text-sm">
                <span className="font-medium">{invitation.email}</span>
                <span className="text-muted-foreground">
                  {' '}
                  as {INVITABLE_ROLE_LABELS[invitation.role].split(':')[0].toLowerCase()}
                </span>
              </p>
              <InviteShareButtons link={invitation.link} email={invitation.email} />
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <Button type="button" size="lg" className="min-h-11" onClick={onFinish}>
            Go to {circleName}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6" aria-labelledby="step-invites-title">
      <div className="space-y-1">
        <h2 id="step-invites-title" className="text-lg font-semibold">
          Invite family members
        </h2>
        <p className="text-sm text-muted-foreground">
          Add people who help with care. You can skip this and invite them later.
        </p>
      </div>

      {serverError && (
        <div role="alert" className="rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive">
          {serverError}
        </div>
      )}

      <ul className="space-y-4">
        {fields.map((field, index) => {
          const emailError = errors.invites?.[index]?.email?.message;
          const roleError = errors.invites?.[index]?.role?.message;
          return (
            <li key={field.id} className="grid gap-3 rounded-md border p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor={`invite-email-${index}`}>Email</Label>
                <Input
                  id={`invite-email-${index}`}
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  placeholder="name@example.com"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? `invite-email-${index}-error` : undefined}
                  className="min-h-11"
                  {...form.register(`invites.${index}.email`)}
                />
                {emailError && (
                  <p id={`invite-email-${index}-error`} className="text-sm text-destructive">
                    {emailError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor={`invite-role-${index}`}>Role</Label>
                <select
                  id={`invite-role-${index}`}
                  aria-invalid={!!roleError}
                  className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...form.register(`invites.${index}.role`)}
                >
                  {INVITABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {INVITABLE_ROLE_LABELS[role].split(':')[0]}
                    </option>
                  ))}
                </select>
                {roleError && <p className="text-sm text-destructive">{roleError}</p>}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className="min-h-11"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                aria-label={`Remove invitation row ${index + 1}`}
              >
                Remove
              </Button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="min-h-11"
          onClick={() => append({ ...EMPTY_ROW })}
          disabled={fields.length >= MAX_INVITE_ROWS}
        >
          Add another person
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" size="lg" className="min-h-11" onClick={onBack}>
            Back
          </Button>
          <Button type="button" variant="ghost" size="lg" className="min-h-11" onClick={onFinish}>
            Skip for now
          </Button>
          <Button type="submit" size="lg" className="min-h-11" disabled={pending}>
            {pending ? 'Sending...' : 'Send invitations'}
          </Button>
        </div>
      </div>
    </form>
  );
}
