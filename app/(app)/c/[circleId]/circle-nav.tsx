'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/nav';
import {
  LayoutDashboard,
  Activity,
  CheckSquare,
  Pill,
  Users,
  Settings,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Activity,
  CheckSquare,
  Pill,
  Users,
  Settings,
};

interface CircleNavProps {
  circleId: string;
  items: NavItem[];
  mobile?: boolean;
}

export function CircleNav({ circleId, items, mobile = false }: CircleNavProps) {
  const pathname = usePathname();

  if (mobile) {
    return (
      <>
        {items.slice(0, 5).map((item) => {
          const href = item.href(circleId);
          const isActive = pathname === href;
          const Icon = iconMap[item.iconName] || LayoutDashboard;

          return (
            <Link
              key={item.title}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
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
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
