import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { Pool } from '@neondatabase/serverless';
import { execSync } from 'node:child_process';

async function resetDatabase() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL_OWNER;
  if (!connectionString) {
    console.error('DATABASE_URL_UNPOOLED or DATABASE_URL_OWNER is required for reset');
    process.exit(1);
  }

  // Refuse if the host looks like production main branch
  const lowerUrl = connectionString.toLowerCase();
  if (lowerUrl.includes('prod') || (lowerUrl.includes('main') && !process.env.FORCE_RESET_MAIN)) {
    console.error('Refusing to reset: connection string indicates production or main branch!');
    console.error('db:reset is only allowed on individual dev branches.');
    process.exit(1);
  }

  console.log('Resetting schema public on dev branch...');
  const pool = new Pool({ connectionString });
  try {
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE;');
    await pool.query('CREATE SCHEMA public;');
    await pool.query('GRANT ALL ON SCHEMA public TO public;');
    console.log('Public schema dropped and recreated.');
  } finally {
    await pool.end();
  }

  console.log('Running db:migrate...');
  execSync('npm run db:migrate', { stdio: 'inherit' });

  console.log('Running db:seed...');
  execSync('npm run db:seed', {
    stdio: 'inherit',
    env: { ...process.env, ALLOW_SEED: 'true' },
  });

  console.log('Database reset complete.');
}

resetDatabase().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
