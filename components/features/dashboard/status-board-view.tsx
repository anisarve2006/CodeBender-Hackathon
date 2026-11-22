'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Pill,
  Clock,
  MapPin,
  Heart,
  MessageSquare,
  Users,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CircleDashboardData } from '@/lib/data/dashboard';

interface StatusBoardViewProps {
  circleId: string;
  recipientName: string;
  data: CircleDashboardData;
}

export function StatusBoardView({ circleId, recipientName, data }: StatusBoardViewProps) {
  const isGreen = data.status === 'green';
  const isAmber = data.status === 'amber';
  const isRed = data.status === 'red';

  const nextAppt = data.next_appointments[0];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* 10-Second Care Beacon */}
      <section
        className={cn(
          'relative overflow-hidden rounded-2xl border p-6 sm:p-7 transition-colors',
          isGreen && 'bg-emerald-950/20 border-emerald-500/30 text-emerald-950 dark:text-emerald-100',
          isAmber && 'bg-amber-950/20 border-amber-500/30 text-amber-950 dark:text-amber-100',
          isRed && 'bg-rose-950/20 border-rose-500/30 text-rose-950 dark:text-rose-100',
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold shadow-xs',
                isGreen && 'bg-emerald-600 text-white',
                isAmber && 'bg-amber-600 text-white',
                isRed && 'bg-rose-600 text-white',
              )}
            >
              {isGreen && <CheckCircle2 className="h-5 w-5" />}
              {isAmber && <AlertTriangle className="h-5 w-5" />}
              {isRed && <AlertTriangle className="h-5 w-5" />}
            </div>
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {isGreen
                  ? `Care is on schedule for ${recipientName}`
                  : isAmber
                  ? `Care update for ${recipientName}`
                  : `Needs immediate attention for ${recipientName}`}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground font-medium">
                {data.status_reason}
              </p>
            </div>
          </div>

          <Link
            href={`/c/${circleId}/care-mode`}
            className="inline-flex items-center gap-2 self-start sm:self-center px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-xs"
          >
            <Heart className="h-4 w-4 fill-current" />
            <span>Care Companion Mode</span>
          </Link>
        </div>
      </section>

      {/* Main Grid: Action Horizon (Left) & Circle Pulse (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Action Horizon (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Next Doctor Appointment */}
          <div className="rounded-2xl border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300">
                  <Calendar className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-lg text-foreground">Next Appointment</h3>
              </div>
              <Link
                href={`/c/${circleId}/appointments`}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {nextAppt ? (
              <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-bold text-base text-foreground">
                    {nextAppt.doctor_name ? `Dr. ${nextAppt.doctor_name}` : nextAppt.title}
                  </span>
                  {nextAppt.specialty && (
                    <span className="text-xs font-medium text-muted-foreground px-2 py-0.5 rounded-md bg-muted">
                      {nextAppt.specialty}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-foreground/90 font-medium">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    {new Date(nextAppt.starts_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {nextAppt.location && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>{nextAppt.location}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                No upcoming doctor visits scheduled. Everything is clear.
              </p>
            )}
          </div>

          {/* Medication Refill Watch */}
          <div className="rounded-2xl border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300">
                  <Pill className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-lg text-foreground">Medication Refill Watch</h3>
              </div>
              <Link
                href={`/c/${circleId}/meds`}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>Manage meds</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {data.refills_due.length > 0 ? (
              <div className="space-y-3">
                {data.refills_due.map((refill) => {
                  const isOverdue = refill.status === 'overdue';
                  const isDueSoon = refill.status === 'due_soon';

                  return (
                    <div
                      key={refill.id}
                      className={cn(
                        'flex items-center justify-between p-3.5 rounded-xl border text-sm',
                        isOverdue && 'bg-rose-500/10 border-rose-500/30',
                        isDueSoon && 'bg-amber-500/10 border-amber-500/30',
                        !isOverdue && !isDueSoon && 'bg-muted/30 border-border',
                      )}
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground">
                          {refill.medication_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {refill.quantity_on_hand} units remaining · {refill.daily_usage} / day
                        </div>
                      </div>

                      <span
                        className={cn(
                          'text-xs font-bold px-2.5 py-1 rounded-full',
                          isOverdue && 'bg-rose-600 text-white',
                          isDueSoon && 'bg-amber-600 text-white',
                          !isOverdue && !isDueSoon && 'bg-muted text-muted-foreground',
                        )}
                      >
                        {isOverdue ? 'Refill Overdue' : isDueSoon ? 'Due Soon' : 'Ordered'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                All prescription supplies are well stocked.
              </p>
            )}
          </div>

          {/* Overdue / Due Care Tasks */}
          {data.overdue_tasks.length > 0 && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 space-y-4">
              <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <h3 className="font-bold text-lg">Action Needed ({data.overdue_tasks.length})</h3>
                </div>
                <Link
                  href={`/c/${circleId}/tasks`}
                  className="text-xs font-semibold hover:underline"
                >
                  View tasks
                </Link>
              </div>

              <div className="space-y-2.5">
                {data.overdue_tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-card border text-sm"
                  >
                    <span className="font-semibold text-foreground">{task.title}</span>
                    <span className="text-xs text-rose-600 font-bold">Overdue</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Circle Heartbeat & Activity (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Latest Family Check-in */}
          <div className="rounded-2xl border bg-card p-6 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-base text-foreground">Family Check-in</h3>
              </div>
              <Link
                href={`/c/${circleId}/family`}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Post update
              </Link>
            </div>

            {data.latest_update ? (
              <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                <p className="text-sm text-foreground/90 leading-relaxed italic">
                  &ldquo;{data.latest_update.body}&rdquo;
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                  <span className="font-semibold text-foreground">
                    {data.latest_update.author_name}
                  </span>
                  {data.latest_update.mood_tag && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {data.latest_update.mood_tag}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                No notes posted today yet. Let family know how {recipientName} is doing.
              </p>
            )}
          </div>

          {/* Who is Handling What */}
          <div className="rounded-2xl border bg-card p-6 space-y-3.5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-base text-foreground">Who is Handling What</h3>
            </div>

            {data.pending_by_member.length > 0 ? (
              <div className="divide-y text-sm">
                {data.pending_by_member.map((member) => (
                  <div key={member.user_id} className="py-2.5 flex items-center justify-between">
                    <span className="font-medium text-foreground">{member.full_name}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                      {member.pending_count} {member.pending_count === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                All family tasks currently completed.
              </p>
            )}
          </div>

          {/* Trust & Privacy Assurance */}
          <div className="rounded-2xl border bg-muted/10 p-5 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Private & Tenant Isolated</span>
            </div>
            <p>
              Records and health logs are encrypted and visible only to approved circle members under verified role permissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
