'use client';

import * as React from 'react';
import { Clock, Download, ExternalLink, MapPin, MessageSquare, Pencil, Stethoscope, User } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { MemberAvatar } from '@/components/shared/MemberAvatar';
import { SensitivityBadge } from '@/components/shared/SensitivityBadge';
import { can } from '@/lib/utils/rbac';
import { formatDateTime } from '@/lib/utils/dates';
import type { CircleRole } from '@/lib/types/app';
import type { AppointmentView } from '@/lib/data/appointments';
import { STATUS_LABELS } from '@/lib/schemas/appointments';
import { cn } from '@/lib/utils';

interface AppointmentCardProps {
  appointment: AppointmentView;
  role: CircleRole;
  onEdit?: (appointment: AppointmentView) => void;
  onOutcome?: (appointment: AppointmentView) => void;
}

const STATUS_VARIANTS: Record<AppointmentView['status'], string> = {
  scheduled: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
  completed: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  missed: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800',
  rescheduled: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

export function AppointmentCard({
  appointment,
  role,
  onEdit,
  onOutcome,
}: AppointmentCardProps) {
  const isPast = new Date(appointment.endsAt) < new Date();
  const canManage = can(role, 'manage_records');
  const needsOutcome =
    isPast &&
    (appointment.status === 'scheduled' || appointment.status === 'rescheduled');

  const mapsUrl = appointment.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appointment.location)}`
    : null;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight text-foreground truncate">
              {appointment.title}
            </h3>
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                STATUS_VARIANTS[appointment.status] || STATUS_VARIANTS.scheduled,
              )}
            >
              {STATUS_LABELS[appointment.status] || appointment.status}
            </span>
            {appointment.sensitivity === 'restricted' && (
              <SensitivityBadge sensitivity="restricted" />
            )}
          </div>
          {(appointment.doctorName || appointment.specialty) && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>
                {appointment.doctorName}
                {appointment.doctorName && appointment.specialty && ' · '}
                {appointment.specialty}
              </span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={`/api/calendar/${appointment.id}`}
            download
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'min-h-11')}
            title="Add to calendar (.ics)"
          >
            <Download className="h-4 w-4 mr-1.5" />
            <span className="text-xs">Calendar</span>
          </a>

          {canManage && onEdit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11"
              onClick={() => onEdit(appointment)}
            >
              <Pencil className="h-4 w-4 mr-1.5" />
              <span className="text-xs">Edit</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground border-t pt-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary shrink-0" />
          <span>
            {formatDateTime(appointment.startsAt, 'Asia/Kolkata', 'EEE, d MMM yyyy · p')}
          </span>
        </div>

        {appointment.location && (
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:underline text-foreground inline-flex items-center gap-1"
                title="Open in Google Maps"
              >
                <span className="truncate">{appointment.location}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ) : (
              <span className="truncate">{appointment.location}</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 sm:col-span-2">
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs">Accompanying:</span>
          {appointment.accompaniedBy && appointment.companionName ? (
            <div className="inline-flex items-center gap-1.5 text-xs text-foreground font-medium">
              <MemberAvatar
                name={appointment.companionName}
                avatarUrl={appointment.companionAvatar}
                className="h-5 w-5 text-[10px]"
              />
              <span>{appointment.companionName}</span>
            </div>
          ) : (
            <span className="text-xs italic text-muted-foreground">None assigned</span>
          )}
        </div>
      </div>

      {appointment.notes && (
        <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground whitespace-pre-line border border-border/50">
          <p className="font-medium text-foreground mb-1">Notes & Instructions:</p>
          {appointment.notes}
        </div>
      )}

      {needsOutcome && canManage && onOutcome && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              Appointment time has passed
            </p>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
              Record doctor notes, reschedule, or mark as completed.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="min-h-11 bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => onOutcome(appointment)}
          >
            <MessageSquare className="h-4 w-4 mr-1.5" />
            How did it go?
          </Button>
        </div>
      )}
    </div>
  );
}
