import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/auth/session';
import { resolveLandingCircleId } from '@/lib/data/circles';

/**
 * Landing route. Last-used circle cookie (if still a membership), then the
 * first circle, then onboarding.
 */
export default async function RootPage() {
  const session = await validateSession();

  if (!session) {
    redirect('/login');
  }

  const circleId = await resolveLandingCircleId(session.user.id);
  redirect(circleId ? `/c/${circleId}` : '/onboarding');
}
