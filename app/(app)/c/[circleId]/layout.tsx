import * as React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Heart } from 'lucide-react';
import { requireCircleRole } from '@/lib/data/circle-context';
import { MAIN_NAV_ITEMS } from '@/lib/nav';
import { QuickAddButton } from '@/components/shared/QuickAddButton';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { LiveCircleListener } from './live-listener';
import { CircleNav } from './circle-nav';
import { CircleUserMenu } from './circle-user-menu';
import { PwaListener } from '@/components/features/pwa/pwa-listener';

export default async function CircleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ circleId: string }>;
}) {
  const { circleId } = await params;
  let ctx;
  try {
    ctx = await requireCircleRole(circleId);
  } catch {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <PwaListener />
      <LiveCircleListener circleId={circleId} />

      {/* Top Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <Link href={`/c/${circleId}`} className="flex items-center gap-2.5 font-bold tracking-tight text-lg text-foreground hover:opacity-90 transition-opacity">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold shadow-xs">
              <Heart className="h-5 w-5 fill-current" />
            </span>
            <div className="flex flex-col">
              <span className="leading-tight text-base sm:text-lg">{ctx.circleName}</span>
              <span className="text-[11px] font-medium text-muted-foreground leading-none">
                Caring for {ctx.recipientName}
              </span>
            </div>
          </Link>
          <RoleBadge role={ctx.role} />
        </div>

        <div className="flex items-center gap-3">
          <CircleUserMenu />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 border-r bg-background/50 md:block p-4 space-y-4">
          <CircleNav circleId={circleId} />
        </aside>

        {/* Main Content View */}
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-12 max-w-6xl">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t bg-background/95 backdrop-blur md:hidden">
        <CircleNav circleId={circleId} mobile />
      </nav>

      {/* Floating Action Quick-Add Button */}
      <QuickAddButton circleId={circleId} role={ctx.role} />

      {/* Persistent Medical Disclaimer Footer */}
      <footer className="border-t bg-background/80 py-3 text-center text-xs text-muted-foreground px-4">
        Kinly organises information only and does not provide medical advice. Always consult a doctor.
      </footer>
    </div>
  );
}
