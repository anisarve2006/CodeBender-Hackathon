'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { verifyEmailTokenAction } from '@/app/(auth)/actions';

export default function VerifyEmailTokenPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [status, setStatus] = React.useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function verify() {
      if (!token) return;
      const res = await verifyEmailTokenAction(token);
      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(res.error || 'Verification failed');
      }
    }
    verify();
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-2">
          {status === 'verifying' && (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              </div>
              <CardTitle className="text-xl font-bold">Verifying email...</CardTitle>
              <CardDescription>Please wait while we confirm your email address.</CardDescription>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <CardTitle className="text-xl font-bold">Email Verified!</CardTitle>
              <CardDescription>Your account is verified. You can now access and create care circles.</CardDescription>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <XCircle className="h-7 w-7" />
              </div>
              <CardTitle className="text-xl font-bold">Verification Failed</CardTitle>
              <CardDescription>{errorMessage || 'The verification link is invalid or expired.'}</CardDescription>
            </>
          )}
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Button onClick={() => router.push(status === 'success' ? '/' : '/login')} className="w-full">
            {status === 'success' ? 'Go to Care Hub' : 'Back to Sign In'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
