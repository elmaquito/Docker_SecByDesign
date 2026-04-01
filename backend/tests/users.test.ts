import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

// Mock pg Pool before importing routes
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    connect: jest.fn(),
    on: jest.fn(),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

// Mock auth middleware
jest.mock('../src/common/middleware', () => ({
  authenticate: (req: Request, _res: Response, next: NextFunction) => {
    (req as Request & { user: object }).user = { id: 1, username: 'admin_test', role: 'admin' };
    next();
  },
  authorize: (_roles: string[]) => (_req: Request, _res: Response, next: NextFunction) => next(),
  apiLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  sanitizeInput: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// Mock AuditLogger
jest.mock('../src/common/audit', () => ({
  AuditLogger: {
    log: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock argon2 to avoid actual hashing in tests
jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('$hashed$password'),
  verify: jest.fn().mockResolvedValue(true),
  argon2id: 2,
}));

import userRoutes from '../src/users/user.routes';

describe('Users API (unit tests - mocked DB)', () => {
  let app: express.Application;
  let pool: Pool;

  beforeEach(() => {
    pool = new Pool();
    app = express();
    app.use(express.json());
    app.use('/api/v1/users', userRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------
  // GET /api/v1/users
  // -------------------------
  describe('GET /api/v1/users', () => {
    it('should return list of users for admin', async () => {
      const fakeUsers = [
        { id: 1, username: 'admin_test', role: 'admin', created_at: new Date().toISOString() },
        { id: 2, username: 'teacher_test', role: 'teacher', created_at: new Date().toISOString() },
      ];
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: fakeUsers });

      const res = await request(app).get('/api/v1/users');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toHaveProperty('username', 'admin_test');
    });

    it('should return 500 when DB fails', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app).get('/api/v1/users');
      expect(res.status).toBe(500);
    });
  });

  // -------------------------
  // POST /api/v1/users
  // -------------------------
  describe('POST /api/v1/users', () => {
    it('should create a user successfully', async () => {
      const newUser = { id: 5, username: 'new_student', role: 'student' };
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [newUser] });

      const res = await request(app)
        .post('/api/v1/users')
        .send({ username: 'new_student', password: 'secure_password_123', role: 'student' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('username', 'new_student');
      expect(res.body).toHaveProperty('role', 'student');
    });

    it('should return 400 for invalid username (too short)', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .send({ username: 'ab', password: 'secure_password_123', role: 'student' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for password shorter than 12 chars', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .send({ username: 'valid_user', password: 'short', role: 'student' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 409 when username already exists', async () => {
      const dbError: Error & { code?: string } = new Error('duplicate key');
      dbError.code = '23505';
      (pool.query as jest.Mock).mockRejectedValueOnce(dbError);

      const res = await request(app)
        .post('/api/v1/users')
        .send({ username: 'existing_user', password: 'secure_password_123', role: 'teacher' });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error', 'Username already exists');
    });
  });

  // -------------------------
  // GET /api/v1/users/me
  // -------------------------
  describe('GET /api/v1/users/me', () => {
    it('should return own account info', async () => {
      const accountInfo = {
        id: 1, username: 'admin_test', email: 'admin@example.com',
        phone: null, role: 'admin', created_at: new Date().toISOString()
      };
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [accountInfo] });

      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('username', 'admin_test');
      expect(res.body).toHaveProperty('email', 'admin@example.com');
    });

    it('should return 404 when user not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'User not found');
    });
  });

  // -------------------------
  // PUT /api/v1/users/me (account update)
  // -------------------------
  describe('PUT /api/v1/users/me', () => {
    it('should update email successfully', async () => {
      const updatedUser = { id: 1, username: 'admin_test', email: 'new@example.com', phone: null, role: 'admin' };
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedUser] });

      const res = await request(app)
        .put('/api/v1/users/me')
        .send({ email: 'new@example.com' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('email', 'new@example.com');
    });

    it('should return 403 when student tries to update account', async () => {
      // Test the controller directly with student user (bypassing route middleware mock)
      const { updateAccount } = await import('../src/users/user.controller');

      const studentApp = express();
      studentApp.use(express.json());
      studentApp.use((req: Request, _res: Response, next: NextFunction) => {
        (req as Request & { user: object }).user = { id: 99, username: 'student_test', role: 'student' };
        next();
      });
      studentApp.put('/me', updateAccount);

      const res = await request(studentApp)
        .put('/me')
        .send({ email: 'student_hack@example.com' });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Students cannot edit their account information');
    });

    it('should return 400 when no fields to update', async () => {
      const res = await request(app)
        .put('/api/v1/users/me')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'No fields to update');
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .put('/api/v1/users/me')
        .send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  // -------------------------
  // GET /api/v1/users/:id/export (GDPR)
  // -------------------------
  describe('GET /api/v1/users/:id/export', () => {
    it('should export own user data (admin exporting own data)', async () => {
      const userData = { id: 1, username: 'admin_test', role: 'admin', created_at: new Date().toISOString() };
      const userNotes = [{ id: 1, title: 'Note 1', content: 'Content', user_id: 1 }];

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [userData] })
        .mockResolvedValueOnce({ rows: userNotes });

      const res = await request(app).get('/api/v1/users/1/export');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('notes');
      expect(res.body.user).toHaveProperty('username', 'admin_test');
    });

    it('should return 403 when student tries to export another user data', async () => {
      // Test the controller directly with student user (bypassing route middleware mock)
      const { exportData } = await import('../src/users/user.controller');

      const studentApp = express();
      studentApp.use(express.json());
      studentApp.use((req: Request, _res: Response, next: NextFunction) => {
        (req as Request & { user: object }).user = { id: 99, username: 'student_test', role: 'student' };
        next();
      });
      studentApp.get('/:id/export', exportData);

      const res = await request(studentApp).get('/1/export');
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Forbidden');
    });

    it('should return 404 when exported user does not exist', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/v1/users/999/export');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'User not found');
    });
  });
});
