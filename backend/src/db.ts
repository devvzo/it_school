import { Pool, type QueryResultRow } from 'pg';
import { DATABASE_URL } from './env';

let pool: Pool | null = null;

if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
  });
} else {
  // eslint-disable-next-line no-console
  console.warn('[db] DATABASE_URL not set, database operations will fail');
}

export { pool };

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  if (!pool) {
    throw new Error('Database not initialized. Please set DATABASE_URL in .env');
  }
  const client = await pool.connect();
  try {
    const res = await client.query<T>(text, params);
    return res.rows;
  } finally {
    client.release();
  }
}


