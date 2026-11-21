import * as React from 'react';
import { MapPin, Users } from 'lucide-react';
import { MemberAvatar } from '@/components/shared/MemberAvatar';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import type { MemberRosterRow } from '@/lib/data/members';

/**
 * components/features/family/member-roster.tsx
 * Owner: Member A
 * Member cards: avatar, role badge, relationship and city.
 */
export function MemberRoster({ members }: { members: MemberRosterRow[] }) {
  if (members.length === 0) {
    return (
      <EmptyState
        title="No family members yet"
        description="Invite people from Settings and they will appear here."
        icon={Users}
      />
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {members.map((member) => (
        <li key={member.userId} className="flex items-start gap-3 rounded-lg border bg-card p-4">
          <MemberAvatar name={member.fullName} avatarUrl={member.avatarUrl} className="h-11 w-11" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium">{member.fullName}</p>
              <RoleBadge role={member.role} />
            </div>
            {member.relationship && <p className="text-sm text-muted-foreground">{member.relationship}</p>}
            {member.city && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {member.city}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
