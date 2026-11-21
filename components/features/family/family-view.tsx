'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/shared/SectionCard';
import { MemberRoster } from './member-roster';
import { WhoDidWhat } from './who-did-what';
import { UpdatesFeed } from './updates-feed';
import { QuickAddUpdateDialog } from '@/components/features/updates/quick-add-update';
import { can } from '@/lib/utils/rbac';
import type { MemberRosterRow } from '@/lib/data/members';
import type { MemberAccountability } from '@/lib/data/dashboard';
import type { UpdateView } from '@/lib/data/updates';
import type { CircleRole } from '@/lib/types/app';
import { Plus } from 'lucide-react';

/**
 * components/features/family/family-view.tsx
 * Owner: Member A
 * Client shell for the Family page: roster, who-did-what, and the updates feed.
 * Viewers do not see the post-update button.
 */

interface FamilyViewProps {
  circleId: string;
  role: CircleRole;
  members: MemberRosterRow[];
  sevenDay: MemberAccountability[];
  thirtyDay: MemberAccountability[];
  updates: UpdateView[];
}

export function FamilyView({ circleId, role, members, sevenDay, thirtyDay, updates }: FamilyViewProps) {
  const [composerOpen, setComposerOpen] = React.useState(false);
  const canPost = can(role, 'manage_records');

  return (
    <div className="space-y-6">
      <SectionCard title="Members" description="Who is in this circle and what their role is.">
        <MemberRoster members={members} />
      </SectionCard>

      <WhoDidWhat circleId={circleId} sevenDay={sevenDay} thirtyDay={thirtyDay} />

      <SectionCard
        title="Family updates"
        description="The latest 20 updates, newest first."
        action={
          canPost ? (
            <Button type="button" size="sm" className="min-h-11" onClick={() => setComposerOpen(true)}>
              <Plus className="mr-1 h-4 w-4" aria-hidden />
              Post update
            </Button>
          ) : undefined
        }
      >
        <UpdatesFeed updates={updates} />
      </SectionCard>

      {canPost && (
        <QuickAddUpdateDialog open={composerOpen} onOpenChange={setComposerOpen} circleId={circleId} />
      )}
    </div>
  );
}
