'use client';

import * as React from 'react';
import { Phone, Calendar, Pill, AlertCircle, Clock, MapPin, Heart } from 'lucide-react';

export interface CareModeMedication {
  id: string;
  name: string;
  strength: string | null;
  form: string | null;
  instructionsAsWritten: string;
}

export interface CareModeAppointment {
  id: string;
  title: string;
  doctorName: string | null;
  specialty: string | null;
  location: string | null;
  startsAt: string;
}

interface CareModeViewProps {
  recipientName: string;
  emergencyPhone: string | null;
  contactName: string;
  medications: CareModeMedication[];
  nextAppointment: CareModeAppointment | null;
}

export function CareModeView({
  recipientName,
  emergencyPhone,
  contactName,
  medications,
  nextAppointment,
}: CareModeViewProps) {
  // Format appointment date
  const apptDate = nextAppointment ? new Date(nextAppointment.startsAt) : null;
  const formattedApptDate = apptDate
    ? apptDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : null;
  const formattedApptTime = apptDate
    ? apptDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : null;

  return (
    <div className="space-y-8 max-w-2xl mx-auto py-4">
      {/* Recipient Welcome Header */}
      <div className="text-center space-y-2 border-b pb-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-base font-semibold">
          <Heart className="h-5 w-5 fill-current" />
          <span>Care Companion View</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Hello, {recipientName}
        </h1>
        <p className="text-xl text-muted-foreground font-medium">
          Here is your simple care guide for today.
        </p>
      </div>

      {/* Primary Emergency Call Button */}
      {emergencyPhone ? (
        <a
          href={`tel:${emergencyPhone}`}
          className="flex items-center justify-center gap-4 w-full min-h-[72px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-2xl shadow-lg transition-transform active:scale-[0.98] cursor-pointer"
        >
          <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
            <Phone className="h-7 w-7" />
          </div>
          <span>Call Family ({contactName})</span>
        </a>
      ) : (
        <div className="rounded-2xl border-2 border-dashed p-6 text-center text-muted-foreground">
          <p className="text-lg font-medium">No direct phone number listed for emergency family contact.</p>
        </div>
      )}

      {/* Next Upcoming Appointment Section */}
      <div className="rounded-2xl border-2 border-primary/30 bg-card p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center gap-3 text-primary">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calendar className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold">Next Doctor Appointment</h2>
        </div>

        {nextAppointment && formattedApptDate ? (
          <div className="space-y-3 pt-2 text-xl">
            <div className="font-extrabold text-2xl text-foreground">
              {nextAppointment.doctorName
                ? `Dr. ${nextAppointment.doctorName}`
                : nextAppointment.title}
            </div>

            {nextAppointment.specialty && (
              <p className="text-lg font-medium text-muted-foreground">
                {nextAppointment.specialty}
              </p>
            )}

            <div className="flex items-center gap-3 text-lg font-semibold text-primary pt-1">
              <Clock className="h-5 w-5 flex-shrink-0" />
              <span>
                {formattedApptDate} at {formattedApptTime}
              </span>
            </div>

            {nextAppointment.location && (
              <div className="flex items-center gap-3 text-lg text-muted-foreground">
                <MapPin className="h-5 w-5 flex-shrink-0" />
                <span>{nextAppointment.location}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xl text-muted-foreground py-2 font-medium">
            No upcoming appointments scheduled right now.
          </p>
        )}
      </div>

      {/* Today's Medicines Section */}
      <div className="rounded-2xl border-2 border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-3 text-foreground">
          <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 border flex items-center justify-center text-blue-600">
            <Pill className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold">Today&apos;s Medicines</h2>
        </div>

        {medications.length === 0 ? (
          <p className="text-xl text-muted-foreground py-2 font-medium">
            No active prescriptions listed in your care record.
          </p>
        ) : (
          <div className="space-y-6">
            {medications.map((med) => (
              <div
                key={med.id}
                className="rounded-xl border-2 border-border/80 bg-muted/20 p-5 space-y-3"
              >
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <h3 className="text-2xl font-extrabold text-foreground">{med.name}</h3>
                  {med.strength && (
                    <span className="text-lg font-bold text-muted-foreground">
                      {med.strength} {med.form || ''}
                    </span>
                  )}
                </div>

                {/* Verbatim instructions guardrail */}
                <div className="pt-1">
                  <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    How to take:
                  </div>
                  <blockquote className="rounded-lg border-l-4 border-primary bg-primary/5 p-4 text-xl font-bold text-foreground italic leading-relaxed">
                    &ldquo;{med.instructionsAsWritten}&rdquo;
                  </blockquote>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl bg-muted/40 p-4 flex items-center gap-3 text-sm text-muted-foreground">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
          <span>
            Instructions are shown verbatim as written on your prescription. Always confirm questions with your doctor or family.
          </span>
        </div>
      </div>
    </div>
  );
}
