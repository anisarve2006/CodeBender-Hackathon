import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { hash } from '@node-rs/argon2';
import { sql } from 'drizzle-orm';
import { adminDb } from '../admin';
import * as schema from '../schema';
import { generateSamplePdfs } from './generate-samples';

async function seed() {
  const allowSeed = process.env.ALLOW_SEED === 'true';
  const connectionString =
    process.env.DATABASE_URL_OWNER || process.env.DATABASE_URL_UNPOOLED || '';

  if (!allowSeed && connectionString.toLowerCase().includes('prod')) {
    console.error('SEED ERROR: ALLOW_SEED is not true and target looks like production database.');
    process.exit(1);
  }

  console.log('Seeding Family Care Hub database...');
  generateSamplePdfs();

  const passwordHash = await hash('Demo@1234', {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  const now = new Date();

  // 1. Create Users
  console.log('Creating seed users...');
  const usersToInsert = [
    {
      email: 'anjali@example.com',
      fullName: 'Anjali Sharma',
      timezone: 'Asia/Kolkata',
      phone: '+91 98200 11223',
    },
    {
      email: 'meera@example.com',
      fullName: 'Meera Sharma',
      timezone: 'Asia/Kolkata',
      phone: '+91 98200 22334',
    },
    {
      email: 'rohit@example.com',
      fullName: 'Rohit Sharma',
      timezone: 'Asia/Kolkata',
      phone: '+91 98200 33445',
    },
    {
      email: 'vikram@example.com',
      fullName: 'Vikram Sharma',
      timezone: 'Asia/Dubai',
      phone: '+971 50 123 4567',
    },
    {
      email: 'kamala@example.com',
      fullName: 'Kamala Sharma',
      timezone: 'Asia/Kolkata',
      phone: '+91 98200 55667',
    },
    {
      email: 'iyer.owner@example.com',
      fullName: 'Suresh Iyer',
      timezone: 'Asia/Kolkata',
      phone: '+91 98400 99887',
    },
  ];

  const userMap = new Map<string, string>();

  for (const u of usersToInsert) {
    const [inserted] = await adminDb
      .insert(schema.users)
      .values({
        email: u.email,
        fullName: u.fullName,
        passwordHash,
        emailVerifiedAt: now,
        timezone: u.timezone,
        phone: u.phone,
      })
      .onConflictDoUpdate({
        target: schema.users.email,
        set: { fullName: u.fullName, passwordHash, emailVerifiedAt: now },
      })
      .returning();
    userMap.set(u.email, inserted.id);
  }

  const anjaliId = userMap.get('anjali@example.com')!;
  const meeraId = userMap.get('meera@example.com')!;
  const rohitId = userMap.get('rohit@example.com')!;
  const vikramId = userMap.get('vikram@example.com')!;
  const kamalaId = userMap.get('kamala@example.com')!;
  const sureshId = userMap.get('iyer.owner@example.com')!;

  // 2. Create Care Circles
  console.log('Creating circles...');
  const [sharmaCircle] = await adminDb
    .insert(schema.careCircles)
    .values({
      name: 'Sharma Family Care Circle',
      createdBy: anjaliId,
      consentConfirmedAt: now,
      consentConfirmedBy: anjaliId,
    })
    .returning();

  const [iyerCircle] = await adminDb
    .insert(schema.careCircles)
    .values({
      name: 'Iyer Family Circle',
      createdBy: sureshId,
      consentConfirmedAt: now,
      consentConfirmedBy: sureshId,
    })
    .returning();

  // 3. Care Recipients
  await adminDb.insert(schema.careRecipients).values([
    {
      circleId: sharmaCircle.id,
      fullName: 'Kamala Sharma',
      dateOfBirth: '1950-04-12',
      bloodGroup: 'B+',
      allergies: ['Penicillin', 'Peanuts'],
      emergencyContact: {
        name: 'Rohit Sharma (Son, Pune)',
        phone: '+91 98200 33445',
        relationship: 'Son',
      },
      primaryDoctor: {
        name: 'Dr. Ramesh Rao',
        phone: '+91 98111 22334',
        hospital: 'Manipal Hospital, Pune',
      },
      notes: 'Hypertension and Type 2 Diabetes; mild arthritis in knees.',
    },
    {
      circleId: iyerCircle.id,
      fullName: 'Janaki Iyer',
      dateOfBirth: '1952-08-20',
      bloodGroup: 'O+',
      allergies: ['Sulfa drugs'],
      notes: 'Thyroid disorder, regular morning walk routine.',
    },
  ]);

  // 4. Circle Members
  await adminDb.insert(schema.circleMembers).values([
    {
      circleId: sharmaCircle.id,
      userId: anjaliId,
      role: 'owner',
      relationship: 'Daughter (Eldest)',
      city: 'Bengaluru',
      joinedAt: now,
    },
    {
      circleId: sharmaCircle.id,
      userId: meeraId,
      role: 'coordinator',
      relationship: 'Daughter',
      city: 'Bengaluru',
      joinedAt: now,
    },
    {
      circleId: sharmaCircle.id,
      userId: rohitId,
      role: 'caregiver',
      relationship: 'Son (Local Caregiver)',
      city: 'Pune',
      joinedAt: now,
    },
    {
      circleId: sharmaCircle.id,
      userId: vikramId,
      role: 'viewer',
      relationship: 'Son (Overseas)',
      city: 'Dubai',
      joinedAt: now,
    },
    {
      circleId: sharmaCircle.id,
      userId: kamalaId,
      role: 'care_recipient',
      relationship: 'Mother',
      city: 'Pune',
      joinedAt: now,
    },
    // Isolation circle member
    {
      circleId: iyerCircle.id,
      userId: sureshId,
      role: 'owner',
      relationship: 'Son',
      city: 'Chennai',
      joinedAt: now,
    },
  ]);

  // 5. Prescriptions & Medications & Refills
  console.log('Seeding medications and refills...');
  const [prescription] = await adminDb
    .insert(schema.prescriptions)
    .values({
      circleId: sharmaCircle.id,
      prescribedOn: '2026-10-15',
      doctorName: 'Dr. Ramesh Rao',
      notes: 'Quarterly review prescription',
      createdBy: anjaliId,
    })
    .returning();

  const [medMetformin] = await adminDb
    .insert(schema.medications)
    .values({
      circleId: sharmaCircle.id,
      name: 'Metformin Hydrochloride',
      strength: '500 mg',
      form: 'Tablet',
      instructionsAsWritten: '1 tablet twice daily after meals (morning and evening)',
      prescribedBy: 'Dr. Ramesh Rao',
      prescriptionId: prescription.id,
      startDate: '2026-10-15',
      isActive: true,
      createdBy: anjaliId,
    })
    .returning();

  const [medAtorvastatin] = await adminDb
    .insert(schema.medications)
    .values({
      circleId: sharmaCircle.id,
      name: 'Atorvastatin',
      strength: '20 mg',
      form: 'Tablet',
      instructionsAsWritten: '1 tablet daily at bedtime',
      prescribedBy: 'Dr. Ramesh Rao',
      prescriptionId: prescription.id,
      startDate: '2026-10-15',
      isActive: true,
      createdBy: meeraId,
    })
    .returning();

  const [medAmlodipine] = await adminDb
    .insert(schema.medications)
    .values({
      circleId: sharmaCircle.id,
      name: 'Amlodipine Besylate',
      strength: '5 mg',
      form: 'Tablet',
      instructionsAsWritten: '1 tablet once daily in the morning',
      prescribedBy: 'Dr. Ramesh Rao',
      prescriptionId: prescription.id,
      startDate: '2026-10-15',
      isActive: true,
      createdBy: rohitId,
    })
    .returning();

  // Refills:
  // Metformin: overdue
  // Atorvastatin: due in 2 days
  // Amlodipine: ok (30 days)
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString().split('T')[0];
  const inTwoDays = new Date(now.getTime() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const inThirtyDays = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];

  await adminDb.insert(schema.refills).values([
    {
      circleId: sharmaCircle.id,
      medicationId: medMetformin.id,
      quantityOnHand: 0,
      dailyUsage: 2,
      lastRefilledOn: '2026-10-20',
      nextRefillDue: yesterday,
      status: 'overdue',
      assignedTo: rohitId,
    },
    {
      circleId: sharmaCircle.id,
      medicationId: medAtorvastatin.id,
      quantityOnHand: 2,
      dailyUsage: 1,
      lastRefilledOn: '2026-10-25',
      nextRefillDue: inTwoDays,
      status: 'due_soon',
      assignedTo: meeraId,
    },
    {
      circleId: sharmaCircle.id,
      medicationId: medAmlodipine.id,
      quantityOnHand: 30,
      dailyUsage: 1,
      lastRefilledOn: '2026-11-15',
      nextRefillDue: inThirtyDays,
      status: 'ok',
      assignedTo: rohitId,
    },
  ]);

  // 6. Appointments
  console.log('Seeding appointments...');
  const tomorrowStart = new Date(now.getTime() + 24 * 3600 * 1000);
  tomorrowStart.setHours(10, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart.getTime() + 45 * 60 * 1000);

  const lastWeekStart = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  lastWeekStart.setHours(11, 30, 0, 0);
  const lastWeekEnd = new Date(lastWeekStart.getTime() + 30 * 60 * 1000);

  const missedStart = new Date(now.getTime() - 2 * 24 * 3600 * 1000);
  missedStart.setHours(15, 0, 0, 0);
  const missedEnd = new Date(missedStart.getTime() + 30 * 60 * 1000);

  await adminDb.insert(schema.appointments).values([
    {
      circleId: sharmaCircle.id,
      title: 'Quarterly Cardiology Consultation',
      doctorName: 'Dr. Ramesh Rao',
      specialty: 'Cardiology',
      location: 'Manipal Hospital, Pune OPD #4',
      startsAt: tomorrowStart,
      endsAt: tomorrowEnd,
      status: 'scheduled',
      accompaniedBy: rohitId,
      notes: 'Bring latest ECG and blood test report',
      sensitivity: 'normal',
      createdBy: anjaliId,
    },
    {
      circleId: sharmaCircle.id,
      title: 'Routine General Health Review',
      doctorName: 'Dr. S. Patel',
      specialty: 'General Medicine',
      location: 'Pune Health Clinic',
      startsAt: lastWeekStart,
      endsAt: lastWeekEnd,
      status: 'completed',
      accompaniedBy: rohitId,
      notes: 'Blood pressure was 128/82. Advised to maintain salt restriction.',
      sensitivity: 'normal',
      createdBy: meeraId,
    },
    {
      circleId: sharmaCircle.id,
      title: 'Dental Cavity Filling & Polish',
      doctorName: 'Dr. Anita Roy',
      specialty: 'Dentistry',
      location: 'Smile Care Center, Pune',
      startsAt: missedStart,
      endsAt: missedEnd,
      status: 'missed',
      accompaniedBy: rohitId,
      notes: 'Missed due to rain. Needs rescheduling.',
      sensitivity: 'normal',
      createdBy: rohitId,
    },
  ]);

  // 7. Tasks (8 tasks across statuses and members)
  console.log('Seeding tasks...');
  const overdueDue = new Date(now.getTime() - 12 * 3600 * 1000);
  const tomorrowDue = new Date(now.getTime() + 20 * 3600 * 1000);
  const nextWeekDue = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

  await adminDb.insert(schema.tasks).values([
    {
      circleId: sharmaCircle.id,
      title: 'Order Metformin 500mg refill urgently',
      description: 'Zero tablets remaining. Order from MedPlus or local pharmacy.',
      category: 'medication',
      priority: 'high',
      status: 'todo',
      dueAt: overdueDue,
      assignedTo: rohitId,
      createdBy: meeraId,
    },
    {
      circleId: sharmaCircle.id,
      title: 'Collect printed ECG report for tomorrow appointment',
      description: 'Pick up physical envelope from diagnostic lab.',
      category: 'paperwork',
      priority: 'high',
      status: 'in_progress',
      dueAt: tomorrowDue,
      assignedTo: rohitId,
      createdBy: anjaliId,
    },
    {
      circleId: sharmaCircle.id,
      title: 'Reschedule missed dental appointment',
      description: 'Call Dr. Anita Roy clinic for an evening slot next Tuesday.',
      category: 'appointment',
      priority: 'normal',
      status: 'todo',
      dueAt: nextWeekDue,
      assignedTo: meeraId,
      createdBy: rohitId,
    },
    {
      circleId: sharmaCircle.id,
      title: 'Check BP with home digital monitor every morning',
      description: 'Log readings into Family Care Hub updates feed.',
      category: 'other',
      priority: 'normal',
      status: 'todo',
      dueAt: tomorrowDue,
      assignedTo: rohitId,
      recurrenceRule: 'daily',
      createdBy: anjaliId,
    },
    {
      circleId: sharmaCircle.id,
      title: 'Pay quarterly health insurance renewal premium',
      description: 'Star Health Senior Citizen red carpet policy renewal.',
      category: 'payment',
      priority: 'normal',
      status: 'done',
      dueAt: lastWeekStart,
      assignedTo: anjaliId,
      completedBy: anjaliId,
      completedAt: lastWeekEnd,
      createdBy: anjaliId,
    },
    {
      circleId: sharmaCircle.id,
      title: 'Order replacement blood glucose test strips (50-pack)',
      description: 'Accu-Chek Active test strips.',
      category: 'errand',
      priority: 'low',
      status: 'todo',
      dueAt: nextWeekDue,
      assignedTo: rohitId,
      createdBy: rohitId,
    },
    {
      circleId: sharmaCircle.id,
      title: 'Schedule video call with Vikram and grandchildren',
      description: 'Kamala wants to see the kids on Sunday afternoon.',
      category: 'other',
      priority: 'low',
      status: 'done',
      dueAt: lastWeekStart,
      assignedTo: vikramId,
      completedBy: vikramId,
      completedAt: lastWeekStart,
      createdBy: meeraId,
    },
    {
      circleId: sharmaCircle.id,
      title: 'Setup pill organizer box for the coming week',
      description: 'Place morning and evening dosages for Mon-Sun.',
      category: 'medication',
      priority: 'normal',
      status: 'in_progress',
      dueAt: tomorrowDue,
      assignedTo: rohitId,
      createdBy: meeraId,
    },
  ]);

  // 8. Family Updates
  console.log('Seeding updates...');
  await adminDb.insert(schema.updates).values([
    {
      circleId: sharmaCircle.id,
      authorId: rohitId,
      body: 'Morning BP reading was 126/80 mmHg. Mother took her 20-min morning walk in the society garden with good energy.',
      moodTag: 'Energetic & Cheerful',
      createdAt: new Date(now.getTime() - 4 * 3600 * 1000),
    },
    {
      circleId: sharmaCircle.id,
      authorId: anjaliId,
      body: 'Spoke with Dr. Rao clinic secretary; confirmed tomorrow appointment slot for 10:00 AM sharp. Rohit will accompany her.',
      moodTag: 'Organized',
      createdAt: new Date(now.getTime() - 20 * 3600 * 1000),
    },
    {
      circleId: sharmaCircle.id,
      authorId: meeraId,
      body: 'Placed order for sugar-free Chyawanprash and steam inhaler. Delivery arriving by Friday evening.',
      moodTag: 'Comfortable',
      createdAt: new Date(now.getTime() - 48 * 3600 * 1000),
    },
  ]);

  // 9. Documents
  console.log('Seeding documents...');
  const [docPrescription] = await adminDb
    .insert(schema.documents)
    .values({
      circleId: sharmaCircle.id,
      kind: 'prescription',
      title: 'Cardiology Prescription - Dr. Rao (Oct 2026)',
      blobPathname: 'seed/sample-prescription.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      reportDate: '2026-10-15',
      sensitivity: 'normal',
      uploadedBy: anjaliId,
    })
    .returning();

  await adminDb.insert(schema.documents).values([
    {
      circleId: sharmaCircle.id,
      kind: 'lab_report',
      title: 'Complete Blood Count (CBC) and HbA1c Lab Report',
      blobPathname: 'seed/sample-lab-report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      reportDate: '2026-10-18',
      sensitivity: 'normal',
      uploadedBy: rohitId,
    },
    {
      circleId: sharmaCircle.id,
      kind: 'scan',
      title: 'Chest X-Ray Diagnostic Report (PA View)',
      blobPathname: 'seed/sample-scan.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 4096,
      checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      reportDate: '2026-09-10',
      sensitivity: 'normal',
      uploadedBy: meeraId,
    },
  ]);

  const [restrictedDoc] = await adminDb
    .insert(schema.documents)
    .values({
      circleId: sharmaCircle.id,
      kind: 'discharge_summary',
      title: 'Confidential Hospital Discharge Summary & Biopsy Notes',
      blobPathname: 'seed/sample-discharge.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 3072,
      checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      reportDate: '2026-08-01',
      sensitivity: 'restricted',
      uploadedBy: anjaliId,
    })
    .returning();

  // Explicit grant: Rohit (caregiver) granted access by Anjali (owner)
  await adminDb.insert(schema.restrictedDocumentGrants).values({
    documentId: restrictedDoc.id,
    userId: rohitId,
    grantedBy: anjaliId,
  });

  // Link prescription document
  await adminDb
    .update(schema.prescriptions)
    .set({ documentId: docPrescription.id })
    .where(sql`id = ${prescription.id}`);

  console.log('✅ Database seeding complete with realistic Sharma & Iyer circles!');
}

seed().catch((err) => {
  console.error('Seed execution error:', err);
  process.exit(1);
});
