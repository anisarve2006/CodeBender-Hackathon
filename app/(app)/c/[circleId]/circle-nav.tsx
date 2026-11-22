'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MAIN_NAV_ITEMS, type NavItem } from '@/lib/nav';
import {
  LayoutDashboard,
  Activity,
  CheckSquare,
  Pill,
  Users,
  Settings,
  Calendar,
  FileText,
  Heart,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Activity,
  CheckSquare,
  Pill,
  Users,
  Settings,
  Calendar,
  FileText,
  Heart,
};

interface CircleNavProps {
  circleId: string;
  items?: NavItem[];
  mobile?: boolean;
}

export function CircleNav({ circleId, items = MAIN_NAV_ITEMS, mobile = false }: CircleNavProps) {
  const pathname = usePathname();

  if (mobile) {
    // Top 5 essential daily care routes on mobile
    const mobileItems = items.filter(
      (item) =>
        item.title === 'Status Board' ||
        item.title === 'Appointments' ||
        item.title === 'Meds & Refills' ||
        item.title === 'Tasks' ||
        item.title === 'Care Companion',
    );

    return (
      <>
        {mobileItems.map((item) => {
          const href = item.href(circleId);
          const isActive = pathname === href;
          const Icon = iconMap[item.iconName] || LayoutDashboard;

          return (
            <Link
              key={item.title}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors py-1',
                isActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title === 'Care Companion' ? 'Companion' : item.title}</span>
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const href = item.href(circleId);
        const isActive = pathname === href;
        const Icon = iconMap[item.iconName] || LayoutDashboard;

        return (
          <Link
            key={item.title}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary font-bold shadow-xs'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
