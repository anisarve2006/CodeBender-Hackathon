'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { MemberAvatar } from '@/components/shared/MemberAvatar';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { changeRoleAction, removeMemberAction } from '@/app/(app)/c/[circleId]/settings/actions';
import type { MemberRosterRow } from '@/lib/data/members';
import { ASSIGNABLE_ROLES, ASSIGNABLE_ROLE_LABELS, type AssignableRole } from '@/lib/schemas/members';

/**
 * components/features/settings-members/member-table.tsx
 * Owner: Member A
 * Member table for owners: change role, remove member. Other roles see the list only.
 * Errors (including "A circle must keep at least one owner.") appear on the row.
 */

interface MemberTableProps {
  circleId: string;
  currentUserId: string;
  canManage: boolean;
  members: MemberRosterRow[];
}

const selectClass =
  'min-h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function MemberTable({ circleId, currentUserId, canManage, members }: MemberTableProps) {
  const router = useRouter();
  const [rowErrors, setRowErrors] = React.useState<Record<string, string>>({});
  const [busyUserId, setBusyUserId] = React.useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = React.useState<MemberRosterRow | null>(null);

  function clearRowError(userId: string) {
    setRowErrors((prev) => {
      if (!(userId in prev)) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }

  async function onChangeRole(member: MemberRosterRow, role: AssignableRole) {
    if (role === member.role) return;
    setBusyUserId(member.userId);
    const result = await changeRoleAction({ circleId, userId: member.userId, role });
    setBusyUserId(null);

    if (!result.ok) {
      setRowErrors((prev) => ({ ...prev, [member.userId]: result.error }));
      return;
    }
    clearRowError(member.userId);
    toast.success(`${member.fullName} is now ${ASSIGNABLE_ROLE_LABELS[role]}`);
    router.refresh();
  }

  async function onRemove(member: MemberRosterRow) {
    setBusyUserId(member.userId);
    const result = await removeMemberAction({ circleId, userId: member.userId });
    setBusyUserId(null);

    if (!result.ok) {
      setRowErrors((prev) => ({ ...prev, [member.userId]: result.error }));
      return;
    }
    clearRowError(member.userId);
    toast.success(`${member.fullName} has been removed`);
    router.refresh();
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th scope="col" className="py-2 pr-3 font-medium">Member</th>
              <th scope="col" className="py-2 pr-3 font-medium">Role</th>
              {canManage && <th scope="col" className="py-2 font-medium"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              const editable = canManage && member.role !== 'care_recipient';
              const error = rowErrors[member.userId];
              return (
                <tr key={member.userId} className="border-b align-top">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <MemberAvatar name={member.fullName} avatarUrl={member.avatarUrl} className="h-8 w-8" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {member.fullName}
                          {isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                        </p>
                        {member.city && <p className="text-xs text-muted-foreground">{member.city}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    {editable ? (
                      <>
                        <label htmlFor={`role-${member.userId}`} className="sr-only">
                          Role for {member.fullName}
                        </label>
                        <select
                          id={`role-${member.userId}`}
                          className={selectClass}
                          value={member.role}
                          disabled={busyUserId === member.userId}
                          onChange={(event) =>
                            onChangeRole(member, event.target.value as AssignableRole)
                          }
                        >
                          {ASSIGNABLE_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ASSIGNABLE_ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <RoleBadge role={member.role} />
                    )}
                    {error && (
                      <p role="alert" className="mt-2 text-xs text-red-700 dark:text-red-400">
                        {error}
                      </p>
                    )}
                  </td>
                  {canManage && (
                    <td className="py-3">
                      {editable && !isSelf && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-11"
                          disabled={busyUserId === member.userId}
                          onClick={() => setRemoveTarget(member)}
                        >
                          Remove
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title="Remove this member?"
        description={
          removeTarget
            ? `${removeTarget.fullName} will lose access to this circle.`
            : ''
        }
        confirmLabel="Remove member"
        destructive
        onConfirm={() => {
          const target = removeTarget;
          setRemoveTarget(null);
          if (target) void onRemove(target);
        }}
      />
    </>
  );
}
