import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/auth/session';
import { getUserFirstCircle } from '@/lib/data/circles';

export default async function RootPage() {
  const session = await validateSession();

  if (!session) {
    redirect('/login');
  }

  const circleId = await getUserFirstCircle(session.user.id);
  if (circleId) {
    redirect(`/c/${circleId}`);
  }

  redirect('/onboarding');
}
