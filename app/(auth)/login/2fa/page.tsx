'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TwoFactorStubPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl font-bold">Two-Factor Authentication</CardTitle>
          <CardDescription>
            TOTP 2FA verification stub. This UI and verification screen will be built by Member A in feature development.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          If TOTP is enabled on your account, enter your authenticator app code here.
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/login" className="block w-full">
            <Button variant="outline" className="w-full">Back to Sign In</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
