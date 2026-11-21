import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MemberAvatarProps {
  name: string;
  avatarUrl?: string | null;
  className?: string;
}

export function MemberAvatar({ name, avatarUrl, className }: MemberAvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Avatar className={className}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback className="bg-slate-200 text-slate-800 text-xs font-semibold dark:bg-slate-700 dark:text-slate-100">
        {initials || '?'}
      </AvatarFallback>
    </Avatar>
  );
}

export function AvatarStack({ members, max = 3 }: { members: Array<{ name: string; avatarUrl?: string | null }>; max?: number }) {
  const visible = members.slice(0, max);
  const extra = members.length - max;

  return (
    <div className="flex -space-x-2 overflow-hidden">
      {visible.map((m, idx) => (
        <MemberAvatar key={idx} name={m.name} avatarUrl={m.avatarUrl} className="ring-2 ring-background inline-block h-7 w-7" />
      ))}
      {extra > 0 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-background">
          +{extra}
        </div>
      )}
    </div>
  );
}
