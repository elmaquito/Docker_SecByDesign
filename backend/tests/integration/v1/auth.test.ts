import request from 'supertest';
import app from '../../../src/main';
import { pool } from '../../../src/config/database';

describe('Auth API (v1) Integration Tests', () => {

  // Run before all tests in this file
  beforeAll(async () => {
    // Clear users
    await pool.query('DELETE FROM users');
    
    // Seed users (using direct SQL to bypass middleware for setup)
    const argon2 = require('argon2');
    const hashedPassword = await argon2.hash('password123'); // Consistency
    
    await pool.query(
      "INSERT INTO users (username, password_hash, role, email) VALUES ($1, $2, $3, $4)",
      ['testuser', hashedPassword, 'student', 'test@example.com']
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users');
    await pool.end();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'testuser', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged in');
      expect(response.body.user).toHaveProperty('username', 'testuser');
      
      // Check cookies
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies as string];
      
      expect(cookieArray.some(c => c.includes('auth_token'))).toBeTruthy();
      expect(cookieArray.some(c => c.includes('refresh_token'))).toBeTruthy();
      expect(cookieArray.some(c => c.includes('HttpOnly'))).toBeTruthy();
    });

    it('should fail with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'testuser', password: 'wrongpassword' });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should fail with non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'nouser', password: 'password123' });
      
      expect(response.status).toBe(401);
    });
  });

  describe('Protected Route Access', () => {
    let authCookie: string;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'testuser', password: 'password123' });
      
      authCookie = loginRes.headers['set-cookie'];
    });

    it('should access protected route with valid cookie', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Cookie', authCookie);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username', 'testuser');
    });

    it('should deny access without cookie', async () => {
      const response = await request(app)
        .get('/api/v1/users/me');
      
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let authCookie: string;

    beforeEach(async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'testuser', password: 'password123' });
      authCookie = loginRes.headers['set-cookie'];
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', authCookie);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged out');
      
      // Check cookies cleared (usually set to empty/expired)
      const cookies = response.headers['set-cookie'];
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies as string];
      expect(cookieArray.some(c => c.includes('auth_token=;'))).toBeTruthy();
    });
  });
});
