import { Pool } from 'pg';

let pool: Pool | null = null;

export function getDb(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function initDb(): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      shop TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('PostgreSQL sessions table ready');
}
