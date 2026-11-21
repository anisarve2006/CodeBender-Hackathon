'use client';

import * as React from 'react';
import Link from 'next/link';
import { Pill, Calendar, Phone, ArrowLeft, Clock, MapPin, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils/dates';

interface CareModeProps {
  circleId: string;
  recipientName: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship?: string;
  } | null;
  medications: Array<{
    id: string;
    name: string;
    strength: string | null;
    instructionsAsWritten: string;
    prescribedBy: string | null;
  }>;
  nextAppointment: {
    id: string;
    title: string;
    doctorName: string | null;
    specialty: string | null;
    location: string | null;
    startsAt: Date;
    companionName: string | null;
  } | null;
}

export function CareModeView({
  circleId,
  recipientName,
  emergencyContact,
  medications,
  nextAppointment,
}: CareModeProps) {
  const phoneHref = emergencyContact?.phone
    ? `tel:${emergencyContact.phone.replace(/[^0-9+]/g, '')}`
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-32 pt-2">
      {/* Header with Exit link */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Care-Recipient Mode
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Hello, {recipientName}
          </h1>
        </div>
        <Link
          href={`/c/${circleId}`}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Full view
        </Link>
      </div>

      {/* Card 1: Today's Medicines */}
      <Card className="border-2 border-primary/30 shadow-lg">
        <CardHeader className="bg-primary/5 pb-4">
          <CardTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
            <Pill className="h-7 w-7 text-primary" aria-hidden="true" />
            Today&apos;s Medicines
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {medications.length === 0 ? (
            <p className="text-xl text-muted-foreground">No active medicines scheduled for today.</p>
          ) : (
            <ul className="divide-y divide-border">
              {medications.map((med) => (
                <li key={med.id} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-2xl font-bold text-foreground">{med.name}</span>
                      {med.strength && (
                        <span className="rounded-md bg-muted px-2.5 py-1 text-base font-semibold text-muted-foreground">
                          {med.strength}
                        </span>
                      )}
                    </div>

                    <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/10 p-4">
                      <span className="block text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                        Instructions as written on prescription:
                      </span>
                      <p className="mt-1 font-mono text-xl font-semibold text-foreground">
                        {med.instructionsAsWritten}
                      </p>
                    </div>

                    {med.prescribedBy && (
                      <p className="text-base text-muted-foreground">
                        Prescribed by: <strong className="text-foreground">{med.prescribedBy}</strong>
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Next Doctor Visit */}
      <Card className="border-2 border-primary/30 shadow-lg">
        <CardHeader className="bg-primary/5 pb-4">
          <CardTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
            <Calendar className="h-7 w-7 text-primary" aria-hidden="true" />
            Next Doctor Visit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {nextAppointment ? (
            <div className="space-y-4 text-xl">
              <div className="flex items-center gap-3 font-semibold text-primary">
                <Clock className="h-6 w-6 shrink-0" />
                <span className="text-2xl font-extrabold">
                  {formatDateTime(nextAppointment.startsAt)}
                </span>
              </div>

              <div>
                <p className="text-2xl font-bold text-foreground">
                  {nextAppointment.doctorName || nextAppointment.title}
                </p>
                {nextAppointment.specialty && (
                  <p className="text-lg text-muted-foreground">{nextAppointment.specialty}</p>
                )}
              </div>

              {nextAppointment.location && (
                <div className="flex items-start gap-2.5 text-lg text-muted-foreground">
                  <MapPin className="mt-1 h-5 w-5 shrink-0 text-primary" />
                  <span>{nextAppointment.location}</span>
                </div>
              )}

              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Who is coming with you:
                    </span>
                    <p className="text-xl font-bold text-foreground">
                      {nextAppointment.companionName || 'Family member accompanying'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xl text-muted-foreground">No upcoming doctor appointments scheduled.</p>
          )}
        </CardContent>
      </Card>

      {/* Fixed Sticky Emergency Call Button */}
      {phoneHref && emergencyContact ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 p-4 shadow-2xl backdrop-blur">
          <div className="mx-auto max-w-3xl">
            <a
              href={phoneHref}
              className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 text-2xl font-bold text-white shadow-xl transition-transform active:scale-[0.98] hover:bg-emerald-700"
            >
              <Phone className="h-7 w-7 fill-white" />
              <span>
                Call Family ({emergencyContact.name}
                {emergencyContact.relationship ? ` - ${emergencyContact.relationship}` : ''})
              </span>
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
