import Link from 'next/link';
import type { ReactNode } from 'react';
import { validateSession } from '@/lib/auth/session';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { AcceptInvitationForm } from '@/components/features/onboarding/accept-invitation-form';
import { cn } from '@/lib/utils';

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await validateSession();
  const returnTo = `/invite/${encodeURIComponent(token)}`;

  let body: ReactNode;
  if (!session) {
    body = (
      <>
        <CardHeader>
          <CardTitle>You have been invited</CardTitle>
          <CardDescription>
            Someone invited you to help coordinate care on Family Care Hub. Create an account or
            sign in with the email address this invitation was sent to. You will then return here
            to join.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/signup?next=${encodeURIComponent(returnTo)}`}
            className={cn(buttonVariants({ size: 'lg' }), 'min-h-11 w-full')}
          >
            Create account
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(returnTo)}`}
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'min-h-11 w-full')}
          >
            Sign in
          </Link>
        </CardFooter>
      </>
    );
  } else if (!session.user.emailVerified) {
    body = (
      <>
        <CardHeader>
          <CardTitle>Verify your email first</CardTitle>
          <CardDescription>
            Before you can join a care circle, verify your email address. Then open this invitation
            again. It stays valid for 72 hours.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link
            href="/verify-email"
            className={cn(buttonVariants({ size: 'lg' }), 'min-h-11 w-full')}
          >
            Go to email verification
          </Link>
        </CardFooter>
      </>
    );
  } else {
    body = (
      <>
        <CardHeader>
          <CardTitle>Join your family&apos;s care circle</CardTitle>
          <CardDescription>
            Accepting adds you to the circle with the role it was sent for. The circle name, who
            invited you and your role appear once you have joined.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcceptInvitationForm token={token} />
        </CardContent>
      </>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-1">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl mb-2">
            FC
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Family Care Hub</h1>
        </div>
        <Card>{body}</Card>
        <p className="text-center text-xs text-muted-foreground">
          Family Care Hub organises information only and does not provide medical advice. Always
          consult a doctor.
        </p>
      </div>
    </div>
  );
}
