import * as React from 'react';
import { requireCircleRole } from '@/lib/data/circle-context';
import { withUserTx } from '@/db/client';
import { sql } from 'drizzle-orm';
import {
  CareModeView,
  type CareModeMedication,
  type CareModeAppointment,
} from '@/components/features/care-mode/care-mode-view';

interface CareModePageProps {
  params: Promise<{ circleId: string }>;
}

export default async function CareModePage({ params }: CareModePageProps) {
  const { circleId } = await params;
  const ctx = await requireCircleRole(circleId, [
    'owner',
    'coordinator',
    'caregiver',
    'viewer',
    'care_recipient',
  ]);

  const data = await withUserTx(ctx.userId, async (tx) => {
    // 1. Recipient & Emergency Contact Details
    const recipientRes = await tx.execute<{
      recipient_name: string;
      emergency_phone: string | null;
      coordinator_name: string | null;
      coordinator_phone: string | null;
    }>(sql`
      SELECT
        cr.full_name AS recipient_name,
        COALESCE(cr.emergency_contact->>'phone', u.phone) AS emergency_phone,
        COALESCE(cr.emergency_contact->>'name', u.full_name, 'Family Caregiver') AS coordinator_name,
        COALESCE(u.phone, cr.emergency_contact->>'phone') AS coordinator_phone
      FROM care_recipients cr
      LEFT JOIN circle_members cm ON cm.circle_id = cr.circle_id AND cm.role IN ('coordinator', 'owner')
      LEFT JOIN users u ON cm.user_id = u.id
      WHERE cr.circle_id = ${circleId}
      LIMIT 1
    `);

    // 2. Active Medications
    const medsRes = await tx.execute<{
      id: string;
      name: string;
      strength: string | null;
      form: string | null;
      instructions_as_written: string;
    }>(sql`
      SELECT id, name, strength, form, instructions_as_written
      FROM medications
      WHERE circle_id = ${circleId}
        AND is_active = true
        AND deleted_at IS NULL
      ORDER BY name ASC
    `);

    // 3. Next Upcoming Appointment
    const apptRes = await tx.execute<{
      id: string;
      title: string;
      doctor_name: string | null;
      specialty: string | null;
      location: string | null;
      starts_at: string;
    }>(sql`
      SELECT id, title, doctor_name, specialty, location, starts_at::text
      FROM appointments
      WHERE circle_id = ${circleId}
        AND starts_at >= now()
        AND status = 'scheduled'
        AND deleted_at IS NULL
      ORDER BY starts_at ASC
      LIMIT 1
    `);

    return {
      recipient: recipientRes.rows[0],
      medications: medsRes.rows.map(
        (m): CareModeMedication => ({
          id: m.id,
          name: m.name,
          strength: m.strength,
          form: m.form,
          instructionsAsWritten: m.instructions_as_written,
        }),
      ),
      nextAppointment: apptRes.rows[0]
        ? ({
          id: apptRes.rows[0].id,
          title: apptRes.rows[0].title,
          doctorName: apptRes.rows[0].doctor_name,
          specialty: apptRes.rows[0].specialty,
          location: apptRes.rows[0].location,
          startsAt: apptRes.rows[0].starts_at,
        } as CareModeAppointment)
        : null,
    };
  });

  const recipientName = data.recipient?.recipient_name || ctx.recipientName || 'Care Companion';
  const emergencyPhone =
    data.recipient?.emergency_phone || data.recipient?.coordinator_phone || null;
  const contactName =
    data.recipient?.emergency_phone ? 'Emergency Contact' : data.recipient?.coordinator_name || 'Caregiver';

  return (
    <CareModeView
      recipientName={recipientName}
      emergencyPhone={emergencyPhone}
      contactName={contactName}
      medications={data.medications}
      nextAppointment={data.nextAppointment}
    />
  );
}
