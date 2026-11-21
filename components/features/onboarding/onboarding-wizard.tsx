'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { StepCircle, type CreatedCircle } from './step-circle';
import { StepRecipient } from './step-recipient';
import { StepInvites } from './step-invites';

const STEP_TITLES = ['Name your circle', 'Care recipient', 'Invite family'] as const;

/**
 * Three-step setup. Circle creation happens in step 1, so the circle id is kept
 * in state for steps 2 and 3. Refreshing the page restarts at step 1.
 */
export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [circle, setCircle] = React.useState<CreatedCircle | null>(null);

  const finish = React.useCallback(() => {
    if (circle) {
      router.push(`/c/${circle.id}`);
    }
  }, [circle, router]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Step {step} of 3: {STEP_TITLES[step - 1]}
          </span>
          <span className="text-muted-foreground">{Math.round((step / 3) * 100)}%</span>
        </div>
        <div
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={step}
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {step === 1 && (
            <StepCircle
              onDone={(created) => {
                setCircle(created);
                setStep(2);
              }}
            />
          )}
          {step === 2 && circle && (
            <StepRecipient
              circleId={circle.id}
              circleName={circle.name}
              onDone={() => setStep(3)}
            />
          )}
          {step === 3 && circle && (
            <StepInvites
              circleId={circle.id}
              circleName={circle.name}
              onFinish={finish}
              onBack={() => setStep(2)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
