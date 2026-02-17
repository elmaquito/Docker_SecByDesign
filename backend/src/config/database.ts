import { Pool } from 'pg';
import { DB_CONFIG } from './env';

// Create a new pool instance with the configuration
export const pool = new Pool(DB_CONFIG);

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});
