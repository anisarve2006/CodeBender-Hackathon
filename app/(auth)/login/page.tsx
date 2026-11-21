'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { signinAction } from '@/app/(auth)/actions';
import { toast } from 'sonner';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signinAction({ email, password });
    setLoading(false);

    if (res.ok) {
      toast.success('Signed in successfully');
      router.push(next);
      router.refresh();
    } else {
      setError(res.error);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Demo@1234');
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="text-center space-y-1">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl mb-2">
          FC
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Family Care Hub</h1>
        <p className="text-sm text-muted-foreground">Sign in to coordinate care for your loved ones</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Enter your credentials to access your care circle</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div
                id="signin-error"
                role="alert"
                className="rounded-md bg-destructive/15 p-3 text-sm text-destructive font-medium"
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby={error ? 'signin-error' : undefined}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby={error ? 'signin-error' : undefined}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <div className="text-center text-xs text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-primary font-medium hover:underline">
                Create account
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>

      {isDemo && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-primary">
              Demo Accounts (Password: Demo@1234)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0 text-xs flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => fillDemo('anjali@example.com')}>
              Anjali (Owner)
            </Button>
            <Button variant="outline" size="sm" onClick={() => fillDemo('meera@example.com')}>
              Meera (Coord)
            </Button>
            <Button variant="outline" size="sm" onClick={() => fillDemo('rohit@example.com')}>
              Rohit (Caregiver)
            </Button>
            <Button variant="outline" size="sm" onClick={() => fillDemo('vikram@example.com')}>
              Vikram (Viewer)
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <React.Suspense fallback={<div className="text-sm text-muted-foreground">Loading login...</div>}>
        <LoginForm />
      </React.Suspense>
    </div>
  );
}
