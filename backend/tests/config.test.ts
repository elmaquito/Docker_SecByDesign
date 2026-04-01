import { loadEnv } from '../src/config/env';
import { pool } from '../src/config/database';

describe('Configuration', () => {
  it('should load environment variables', () => {
    const env = loadEnv();
    expect(env.DB_HOST).toBeDefined();
    expect(env.DB_PORT).toBeDefined();
    expect(env.DB_USER).toBeDefined();
    expect(env.DB_PASSWORD).toBeDefined();
    expect(env.DB_DATABASE).toBeDefined();
    expect(env.JWT_SECRET).toBeDefined();
  });

  it('should create a database pool', () => {
    expect(pool).toBeDefined();
    expect(pool.options.host).toBe(process.env.DB_HOST);
  });

  afterAll(async () => {
    await pool.end();
  });
});
