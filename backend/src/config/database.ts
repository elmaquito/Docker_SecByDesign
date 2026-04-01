import { Pool } from 'pg';
import { DB_CONFIG } from './env';

// Create a new pool instance with the configuration
export const pool = new Pool(DB_CONFIG);

// Améliorer la gestion d'erreurs
pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
  console.error('Config utilisée:', {
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    database: DB_CONFIG.database
  });
  // Ne pas faire process.exit(-1) immédiatement
  // process.exit(-1);
});

// Ajouter un test de connexion au démarrage
export async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected successfully:', result.rows[0].now);
    client.release();
    return true;
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Retrying in 5 seconds...');
    // Retry logic instead of immediate exit
    return false;
  }
}
