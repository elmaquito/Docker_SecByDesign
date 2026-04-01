import { DB_CONFIG, JWT_SECRET } from '../src/config/env';
import { pool } from '../src/config/database';

describe('Configuration', () => {
  it('should load environment variables', () => {
    expect(DB_CONFIG.host).toBeDefined();
    expect(DB_CONFIG.port).toBeDefined();
    expect(DB_CONFIG.user).toBeDefined();
    expect(DB_CONFIG.password).toBeDefined();
    expect(DB_CONFIG.database).toBeDefined();
    expect(JWT_SECRET).toBeDefined();
  });

  it('should create a database pool', () => {
    expect(pool).toBeDefined();
    expect(pool.options.host).toBe(DB_CONFIG.host);
  });

  afterAll(async () => {
    await pool.end();
  });
});
