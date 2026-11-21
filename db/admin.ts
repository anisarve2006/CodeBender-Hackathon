import 'server-only';
/**
 * Privileged: bypasses RLS. Only for lib/auth, lib/jobs, app/api/jobs, the seed script and migrations.
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';
import { serverEnv } from '@/lib/env';

if (!globalThis.WebSocket) {
  neonConfig.webSocketConstructor = ws;
}

const adminPool = new Pool({
  connectionString: serverEnv.DATABASE_URL_OWNER,
});

export const adminDb = drizzle(adminPool, { schema });
export type AdminTransaction = Parameters<Parameters<typeof adminDb.transaction>[0]>[0];
