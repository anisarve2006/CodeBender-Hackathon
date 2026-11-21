'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { useLiveCircle } from '@/lib/live/use-live-circle';
import { can } from '@/lib/utils/rbac';
import type { CircleRole } from '@/lib/types/app';
import type { AppointmentView } from '@/lib/data/appointments';
import { AppointmentCard } from './appointment-card';
import { QuickAddAppointmentDialog } from './quick-add-appointment';
import { AppointmentEditDialog } from './appointment-edit-dialog';
import { AppointmentOutcomeDialog } from './appointment-outcome-dialog';
import { cn } from '@/lib/utils';

interface AppointmentsViewProps {
  circleId: string;
  role: CircleRole;
  upcoming: AppointmentView[];
  past: AppointmentView[];
  members: { userId: string; fullName: string }[];
}

export function AppointmentsView({
  circleId,
  role,
  upcoming,
  past,
  members,
}: AppointmentsViewProps) {
  const router = useRouter();
  const [tab, setTab] = React.useState<'upcoming' | 'past'>('upcoming');
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);
  const [editingAppointment, setEditingAppointment] = React.useState<AppointmentView | null>(null);
  const [outcomeAppointment, setOutcomeAppointment] = React.useState<AppointmentView | null>(null);

  // Poll circle version to keep view synced with family changes
  useLiveCircle(circleId, () => {
    router.refresh();
  });

  const canManage = can(role, 'manage_records');
  const items = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border bg-muted p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => setTab('upcoming')}
            className={cn(
              'px-4 py-2 rounded-md transition-all min-h-11 cursor-pointer',
              tab === 'upcoming'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Upcoming ({upcoming.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('past')}
            className={cn(
              'px-4 py-2 rounded-md transition-all min-h-11 cursor-pointer',
              tab === 'past'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Past Visits ({past.length})
          </button>
        </div>

        {canManage && (
          <Button
            type="button"
            className="min-h-11 shrink-0"
            onClick={() => setQuickAddOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Appointment
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={tab === 'upcoming' ? 'No upcoming appointments' : 'No past appointment history'}
          description={
            tab === 'upcoming'
              ? 'Schedule doctor visits, clinic consultations, or checkups for the family.'
              : 'Past visits and completed consultations will appear here.'
          }
          icon={Calendar}
          actionLabel={tab === 'upcoming' && canManage ? 'Schedule Appointment' : undefined}
          onAction={tab === 'upcoming' && canManage ? () => setQuickAddOpen(true) : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              role={role}
              onEdit={canManage ? setEditingAppointment : undefined}
              onOutcome={canManage ? setOutcomeAppointment : undefined}
            />
          ))}
        </div>
      )}

      <QuickAddAppointmentDialog
        circleId={circleId}
        members={members}
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
      />

      <AppointmentEditDialog
        circleId={circleId}
        appointment={editingAppointment}
        members={members}
        open={editingAppointment !== null}
        onOpenChange={(open) => !open && setEditingAppointment(null)}
      />

      <AppointmentOutcomeDialog
        circleId={circleId}
        appointment={outcomeAppointment}
        open={outcomeAppointment !== null}
        onOpenChange={(open) => !open && setOutcomeAppointment(null)}
      />
    </div>
  );
}
