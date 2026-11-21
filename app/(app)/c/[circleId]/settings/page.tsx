/**
 * Circle settings page (server component)
 * Owner: Member A
 * Circle name, care recipient, member table and open invitations. Each section
 * is shown according to the caller's role; the actions enforce the same rules.
 */

import { PageHeader } from '@/components/shared/PageHeader';
import { SectionCard } from '@/components/shared/SectionCard';
import { CircleInfoForm } from '@/components/features/settings-members/circle-info-form';
import { RecipientForm } from '@/components/features/settings-members/recipient-form';
import { MemberTable } from '@/components/features/settings-members/member-table';
import { InviteList } from '@/components/features/settings-members/invite-list';
import { requireCircleRole } from '@/lib/data/circle-context';
import { listMemberRoster } from '@/lib/data/members';
import { listPendingInvitations } from '@/lib/data/invitations';
import { getCareRecipient } from '@/lib/data/circles';
import { can } from '@/lib/utils/rbac';

export default async function CircleSettingsPage({
  params,
}: {
  params: Promise<{ circleId: string }>;
}) {
  const { circleId } = await params;
  const ctx = await requireCircleRole(circleId);

  const canEditCircle = ctx.role === 'owner' || ctx.role === 'coordinator';
  const canManageMembers = can(ctx.role, 'manage_members');
  const canInvite = can(ctx.role, 'invite_members');

  const [members, recipient, invites] = await Promise.all([
    listMemberRoster(circleId, ctx.userId),
    getCareRecipient(ctx.userId, circleId),
    canInvite ? listPendingInvitations(ctx.userId, circleId) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Circle Settings"
        subtitle="Care recipient profile, members, and invitations"
      />

      <SectionCard title="Circle" description="The name your family sees for this circle.">
        {canEditCircle ? (
          <CircleInfoForm circleId={circleId} initialName={ctx.circleName} />
        ) : (
          <p className="text-sm">{ctx.circleName}</p>
        )}
      </SectionCard>

      <SectionCard
        title="Care recipient"
        description="Stored exactly as entered. The app does not interpret these details."
      >
        {canEditCircle ? (
          <RecipientForm circleId={circleId} details={recipient} />
        ) : (
          <p className="text-sm">{recipient?.fullName ?? ctx.recipientName}</p>
        )}
      </SectionCard>

      <SectionCard
        title="Members"
        description={
          canManageMembers
            ? 'Change a role or remove a member. A circle must keep at least one owner.'
            : 'Who is in this circle and their role.'
        }
      >
        <MemberTable
          circleId={circleId}
          currentUserId={ctx.userId}
          canManage={canManageMembers}
          members={members}
        />
      </SectionCard>

      {canInvite && (
        <SectionCard
          title="Invitations"
          description="Open invitations. Resend creates a new link and stops the old one working."
        >
          <InviteList circleId={circleId} invites={invites} />
        </SectionCard>
      )}
    </div>
  );
}
