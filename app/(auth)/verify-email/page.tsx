'use client';

import * as React from 'react';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function VerifyEmailPromptPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription>
            We have sent a verification link to your email address. Please click the link to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>Links are valid for 24 hours.</p>
          <p>
            In local development mode without Resend API credentials, check your server console log to copy the simulated verification link.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Link href="/login" className="block w-full">
            <Button variant="outline" className="w-full">Return to Sign In</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
