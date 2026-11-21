import Link from 'next/link';
import { Calendar, CalendarPlus, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { requireUser } from '@/lib/auth/session';
import { requireCircleRole } from '@/lib/data/circle-context';
import { getAppointments, getCircleMemberOptions } from '@/lib/data/appointments';
import { can } from '@/lib/utils/rbac';
import { formatDateTime } from '@/lib/utils/dates';
import { cn } from '@/lib/utils';
import { QuickAddAppointmentButton } from '@/components/features/appointments/quick-add-appointment';
import { ResolveAppointmentBanner } from '@/components/features/appointments/resolve-appointment-banner';

type TabValue = 'upcoming' | 'past';

const TABS: { value: TabValue; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'border-blue-500/40 text-blue-700 dark:text-blue-300' },
  completed: {
    label: 'Completed',
    className: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
  },
  missed: { label: 'Missed', className: 'border-red-500/40 text-red-700 dark:text-red-300' },
  rescheduled: {
    label: 'Rescheduled',
    className: 'border-amber-500/40 text-amber-700 dark:text-amber-300',
  },
  cancelled: { label: 'Cancelled', className: 'border-muted-foreground/40 text-muted-foreground' },
};

/** Reads the current time outside component render (keeps render pure). */
function getRequestTime(): number {
  return Date.now();
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default async function AppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ circleId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { circleId } = await params;
  const { tab: rawTab } = await searchParams;
  const tab: TabValue = rawTab === 'past' ? 'past' : 'upcoming';

  const [ctx, viewer, members, appointments] = await Promise.all([
    requireCircleRole(circleId),
    requireUser(),
    getCircleMemberOptions(circleId),
    getAppointments(circleId, tab),
  ]);

  const canManage = can(ctx.role, 'manage_records');
  const now = getRequestTime();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Doctor Appointments"
          subtitle="Upcoming doctor visits, clinic locations, and appointment history"
        />
        {canManage && <QuickAddAppointmentButton circleId={circleId} members={members} />}
      </div>

      <p className="text-sm text-muted-foreground">
        Family Care Hub organises information only and does not provide medical advice. Always
        consult a doctor.
      </p>

      <nav aria-label="Appointment view" className="flex gap-2">
        {TABS.map((item) => {
          const active = item.value === tab;
          return (
            <Link
              key={item.value}
              href={`/c/${circleId}/appointments?tab=${item.value}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-11 items-center rounded-md border px-4 text-sm font-medium',
                active ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {appointments.length === 0 ? (
        <EmptyState
          title={tab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments yet'}
          description={
            tab === 'upcoming'
              ? 'Scheduled doctor visits will appear here, with preparation tasks and reminders.'
              : 'Completed and missed visits will be listed here.'
          }
          icon={Calendar}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {appointments.map((appointment) => {
            const needsResolution =
              canManage &&
              appointment.status === 'scheduled' &&
              appointment.endsAt.getTime() < now;
            const statusMeta = STATUS_LABELS[appointment.status] ?? STATUS_LABELS.scheduled;
            const location = appointment.location?.trim() ?? '';

            return (
              <li
                key={appointment.id}
                className="space-y-3 rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-base font-semibold break-words">
                      {appointment.doctorName || appointment.title}
                    </h3>
                    {appointment.doctorName && (
                      <p className="text-sm text-muted-foreground break-words">{appointment.title}</p>
                    )}
                  </div>
                  <Badge variant="outline" className={cn('shrink-0', statusMeta.className)}>
                    {statusMeta.label}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  {appointment.specialty && <Badge variant="secondary">{appointment.specialty}</Badge>}
                  {appointment.sensitivity === 'restricted' && (
                    <Badge variant="outline">Restricted</Badge>
                  )}
                </div>

                <p className="text-sm">
                  {formatDateTime(appointment.startsAt, viewer.timezone)}
                  {' – '}
                  {formatDateTime(appointment.endsAt, viewer.timezone, 'p')}
                </p>

                {location && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4"
                  >
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    <span className="break-words">{location}</span>
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}

                <div className="flex items-center justify-between gap-3">
                  {appointment.companionName ? (
                    <span
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground"
                      title={`Coming with: ${appointment.companionName}`}
                    >
                      {appointment.companionAvatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={appointment.companionAvatarUrl}
                          alt=""
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground"
                        >
                          {initialsOf(appointment.companionName)}
                        </span>
                      )}
                      <span>
                        Coming with <span className="font-medium text-foreground">{appointment.companionName}</span>
                      </span>
                    </span>
                  ) : (
                    <span />
                  )}

                  <a
                    href={`/api/calendar/${appointment.id}`}
                    download="appointment.ics"
                    className="inline-flex min-h-11 items-center gap-1 text-sm underline underline-offset-4"
                  >
                    <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                    Add to calendar
                  </a>
                </div>

                {needsResolution && (
                  <ResolveAppointmentBanner
                    circleId={circleId}
                    appointment={{
                      id: appointment.id,
                      title: appointment.title,
                      doctorName: appointment.doctorName,
                      specialty: appointment.specialty,
                      location: appointment.location,
                      startsAt: appointment.startsAt,
                      endsAt: appointment.endsAt,
                      accompaniedBy: appointment.accompaniedBy,
                      notes: appointment.notes,
                      sensitivity: appointment.sensitivity,
                    }}
                    members={members}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
