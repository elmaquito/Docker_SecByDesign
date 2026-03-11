import request from 'supertest';
import app from '../../../src/main'; // Or whatever your app import point is
import { pool } from '../../../src/config/database'; // If you need direct DB access

describe('Backend Health Check', () => {

  afterAll(async () => {
    await pool.end(); // Clean up connections
  });

  describe('GET /api/v1/health', () => {
    it('should return 200 OK', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'OK');
      expect(res.body).toHaveProperty('time');
    });
  });

  describe('GET /health (Legacy)', () => {
    it('should return 200 OK for backward compatibility', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'OK');
    });
  });
});
