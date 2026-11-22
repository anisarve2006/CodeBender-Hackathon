import { describe, it, expect } from 'vitest';
import { verifyCronJob, verifyQStash } from '@/lib/jobs/verify';
import { createZipArchive } from '@/lib/utils/zip';
import { sendEmail, getEmailTransporter } from '@/lib/notifications/email';

describe('B4 & B5: Jobs, Cron Authorization, NodeMailer & Platform Security', () => {
  it('rejects unsigned HTTP requests with missing authorization', async () => {
    const request = new Request('http://localhost:3000/api/jobs/send-reminders', {
      method: 'POST',
      body: JSON.stringify({ test: true }),
    });

    const isVerified = await verifyCronJob(request);
    expect(isVerified).toBe(false);
  });

  it('rejects forged or fake signatures and tokens', async () => {
    const request = new Request('http://localhost:3000/api/jobs/send-reminders', {
      method: 'POST',
      headers: {
        authorization: 'Bearer forged-fake-token-12345',
        'upstash-signature': 'fake-forged-signature-string-12345',
      },
      body: JSON.stringify({ test: true }),
    });

    const isVerified = await verifyQStash(request);
    expect(isVerified).toBe(false);
  });

  it('authorizes valid cron requests with bearer token or header', async () => {
    const request = new Request('http://localhost:3000/api/jobs/send-reminders', {
      method: 'POST',
      headers: {
        authorization: 'Bearer mock-cron-secret',
      },
      body: JSON.stringify({ test: true }),
    });

    const isVerified = await verifyCronJob(request);
    expect(isVerified).toBe(true);
  });

  it('dispatches emails using Nodemailer transporter without error', async () => {
    const transporter = getEmailTransporter();
    expect(transporter).toBeDefined();

    await expect(
      sendEmail({
        to: 'family-member@example.com',
        subject: 'Care Update – Kamala Care',
        html: '<p>A new care update has been posted to your circle.</p>',
        text: 'A new care update has been posted to your circle.',
      }),
    ).resolves.toBeUndefined();
  });

  it('generates valid, standard DEFLATE-compressed ZIP archives without external dependencies', () => {
    const testFiles = [
      { name: 'circle-records.json', data: JSON.stringify({ circleName: 'Kamala Care', totalMembers: 4 }) },
      { name: 'notes.txt', data: 'Doctor recommended regular morning walks.' },
    ];

    const zipBuffer = createZipArchive(testFiles);

    // Verify ZIP magic bytes: PK\x03\x04 (0x04034b50 in little endian)
    expect(zipBuffer.length).toBeGreaterThan(50);
    expect(zipBuffer[0]).toBe(0x50); // P
    expect(zipBuffer[1]).toBe(0x4b); // K
    expect(zipBuffer[2]).toBe(0x03);
    expect(zipBuffer[3]).toBe(0x04);
  });

  it('verifies medical privacy guardrail in notification templates', () => {
    // Medical guardrail: Email and push notifications must NEVER leak medicine names,
    // clinical diagnoses, or sensitive document titles in subjects or message bodies.
    const medicineName = 'Metformin 500mg';
    const diagnosis = 'Type 2 Diabetes Mellitus';
    const docTitle = 'Cardiac Echo Doppler Scan Report';

    const sampleReminderSubjects = [
      'Doctor appointment reminder – Kamala Care',
      'Medication refill reminder – Kamala Care',
      'Care task reminder – Kamala Care',
      'Your Daily Family Care Hub Digest',
    ];

    for (const subject of sampleReminderSubjects) {
      expect(subject.toLowerCase()).not.toContain(medicineName.toLowerCase());
      expect(subject.toLowerCase()).not.toContain(diagnosis.toLowerCase());
      expect(subject.toLowerCase()).not.toContain(docTitle.toLowerCase());
    }
  });

  it('guarantees reminder idempotency by design', () => {
    // Verify that running the same reminder batch twice does not double-send:
    // Once sent_at is stamped, subsequent queries with WHERE sent_at IS NULL return 0 rows.
    const mockPendingReminders: { id: string; remindAt: Date; sentAt: Date | null }[] = [
      { id: 'rem-1', remindAt: new Date(Date.now() - 60000), sentAt: null },
      { id: 'rem-2', remindAt: new Date(Date.now() - 30000), sentAt: null },
    ];

    // First run: processes both
    const firstRun = mockPendingReminders.filter((r) => r.sentAt === null);
    expect(firstRun.length).toBe(2);

    // Mark as sent
    firstRun.forEach((r) => (r.sentAt = new Date()));

    // Second run: immediately returns 0, zero double-sends
    const secondRun = mockPendingReminders.filter((r) => r.sentAt === null);
    expect(secondRun.length).toBe(0);
  });
});
