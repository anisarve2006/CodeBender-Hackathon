import Link from 'next/link';
import Image from 'next/image';
import { requireUser } from '@/lib/auth/session';
import { PageHeader } from '@/components/shared/PageHeader';
import { buttonVariants } from '@/components/ui/button';
import { OnboardingWizard } from '@/components/features/onboarding/onboarding-wizard';
import { cn } from '@/lib/utils';

export default async function OnboardingPage() {
  const user = await requireUser();

  if (!user.emailVerified) {
    return (
      <div className="container max-w-2xl py-12 px-4 space-y-6">
        <PageHeader
          title="Verify your email first"
          subtitle="Setting up a care circle needs a verified email address."
        />
        <div className="space-y-4 rounded-lg border p-6">
          <p className="text-sm">
            You can sign in while your email is unverified, but you cannot create or join a care
            circle until it is verified. Open the verification link we sent when you signed up,
            then come back here.
          </p>
          <Link
            href="/verify-email"
            className={cn(buttonVariants({ size: 'lg' }), 'min-h-11')}
          >
            Go to email verification
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-12 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Image
          src="/logo.png"
          alt="Kinly Logo"
          width={40}
          height={40}
          className="h-10 w-10 rounded-xl object-contain shadow-xs border border-border/40"
          priority
        />
        <div>
          <span className="font-bold text-lg leading-tight tracking-tight block">Kinly</span>
          <span className="text-xs text-muted-foreground leading-none">Family Care Hub</span>
        </div>
      </div>
      <PageHeader
        title="Set up your care circle"
        subtitle="Three quick steps. You can change everything later."
      />
      <OnboardingWizard />
    </div>
  );
}
