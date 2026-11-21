import 'server-only';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import ws from 'ws';
import * as schema from './schema';
import { serverEnv } from '@/lib/env';

if (!globalThis.WebSocket) {
  neonConfig.webSocketConstructor = ws;
}

const pool = new Pool({
  connectionString: serverEnv.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export type AppTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * All app reads and writes must go through withUserTx.
 * It opens a transaction, sets app.user_id for RLS enforcement, and runs the provided function.
 */
export async function withUserTx<T>(
  userId: string,
  fn: (tx: AppTransaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}
