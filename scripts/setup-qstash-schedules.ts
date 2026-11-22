/**
 * scripts/setup-qstash-schedules.ts
 *
 * Configures the four automated recurring schedules in Upstash QStash:
 * 1. send-reminders:  Every 15 min (*\/15 * * * *)
 * 2. refill-checker:   Daily at 07:00 IST = 01:30 UTC (30 1 * * *)
 * 3. daily-digest:    Daily at 20:00 IST = 14:30 UTC (30 14 * * *)
 * 4. escalation:      Hourly at minute 0 (0 * * * *)
 *
 * Usage:
 *   npx tsx scripts/setup-qstash-schedules.ts
 * Run after every production deploy or when changing NEXT_PUBLIC_SITE_URL.
 */

import { Client } from '@upstash/qstash';
import dotenv from 'dotenv';

dotenv.config();

const qstashToken = process.env.QSTASH_TOKEN;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

if (!qstashToken) {
  console.warn('⚠️  QSTASH_TOKEN not found in environment. Skipping QStash schedule setup.');
  process.exit(0);
}

const client = new Client({ token: qstashToken });

interface ScheduleConfig {
  name: string;
  destination: string;
  cron: string;
}

const SCHEDULES: ScheduleConfig[] = [
  {
    name: 'send-reminders',
    destination: `${siteUrl}/api/jobs/send-reminders`,
    cron: '*/15 * * * *', // Every 15 minutes
  },
  {
    name: 'refill-checker',
    destination: `${siteUrl}/api/jobs/refill-checker`,
    cron: '30 1 * * *', // Daily at 07:00 IST (01:30 UTC)
  },
  {
    name: 'daily-digest',
    destination: `${siteUrl}/api/jobs/daily-digest`,
    cron: '30 14 * * *', // Daily at 20:00 IST (14:30 UTC)
  },
  {
    name: 'escalation',
    destination: `${siteUrl}/api/jobs/escalation`,
    cron: '0 * * * *', // Every hour
  },
];

async function main() {
  console.log(`Setting up QStash schedules targeting site: ${siteUrl}`);

  // 1. Fetch existing schedules
  const existingList = await client.schedules.list();
  console.log(`Found ${existingList.length} existing QStash schedules.`);

  for (const config of SCHEDULES) {
    // 2. Check if a schedule with this destination already exists
    const match = existingList.find((s) => s.destination === config.destination);

    if (match) {
      console.log(`Schedule for ${config.name} already exists (ID: ${match.scheduleId}). Updating...`);
      await client.schedules.delete(match.scheduleId);
    }

    // 3. Create schedule
    const created = await client.schedules.create({
      destination: config.destination,
      cron: config.cron,
    });

    console.log(`✅ Created schedule for ${config.name}: ${config.cron} -> ${config.destination} (ID: ${created.scheduleId})`);
  }

  console.log('All 4 QStash schedules configured successfully.');
}

main().catch((err) => {
  console.error('Failed to configure QStash schedules:', err);
  process.exit(1);
});
