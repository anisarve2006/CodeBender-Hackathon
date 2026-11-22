'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { acceptInvitationAction } from '@/app/(auth)/invite/[token]/actions';

export function AcceptInvitationForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function accept() {
    setPending(true);
    setError(null);
    const result = await acceptInvitationAction({ token });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success('You have joined the care circle.');
    router.push(`/c/${result.data.circleId}`);
  }

  return (
    <div className="space-y-3">
      {error && (
        <div role="alert" className="rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive">
          {error}
        </div>
      )}
      <Button size="lg" className="w-full min-h-11" onClick={accept} disabled={pending}>
        {pending ? 'Joining...' : 'Accept invitation'}
      </Button>
    </div>
  );
}
