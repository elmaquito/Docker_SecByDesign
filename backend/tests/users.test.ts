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
    req.user = { id: 1, username: 'admin_test', role: 'admin' };
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
import * as UserController from '../src/users/user.controller';

describe('Users API (unit tests - mocked DB)', () => {
  let app: express.Application;
  let pool: any;

  beforeEach(() => {
    pool = new Pool();
    app = express();
    app.use(express.json());
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.user = { id: 1, username: 'admin_test', role: 'admin' };
      next();
    });
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

    it('should return 409 when username already exists', async () => {
      const err: any = new Error('Duplicate'); err.code = '23505';
      (pool.query as jest.Mock).mockRejectedValueOnce(err);
      const res = await request(app).post('/api/v1/users').send({ username: 'dup', password: 'secure_pass_123', role: 'student' });
      expect(res.status).toBe(409);
    });

    it('should return 400 for invalid role', async () => {
      const res = await request(app).post('/api/v1/users').send({ username: 'bad', password: 'pass123', role: 'superuser' });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------
  // GET /api/v1/users/me
  // -------------------------
  describe('GET /api/v1/users/me', () => {
    it('should return the authenticated user account', async () => {
      const fakeUser = { id: 1, username: 'admin_test', email: null, phone: null, role: 'admin', created_at: new Date().toISOString() };
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [fakeUser] });
      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('username', 'admin_test');
    });

    it('should return 404 when user not found in DB', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(404);
    });

    it('should return 500 on DB error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(500);
    });
  });

  // -------------------------
  // PUT /api/v1/users/me
  // -------------------------
  describe('PUT /api/v1/users/me', () => {
    it('should update email and phone', async () => {
      const updatedUser = { id: 1, username: 'admin_test', email: 'a@b.com', phone: '0123', role: 'admin' };
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedUser] });
      const res = await request(app).put('/api/v1/users/me').send({ email: 'a@b.com', phone: '0123' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('email', 'a@b.com');
    });

    it('should return 400 when no fields provided', async () => {
      const res = await request(app).put('/api/v1/users/me').send({});
      expect(res.status).toBe(400);
    });

    it('should return 403 for student role', async () => {
      const mockReq = {
        user: { id: 3, username: 'student_test', role: 'student' },
        body: { email: 'x@y.com' },
        cookies: {}, ip: '127.0.0.1', get: jest.fn(),
      } as any;
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      await UserController.updateAccount(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 on DB error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app).put('/api/v1/users/me').send({ email: 'a@b.com' });
      expect(res.status).toBe(500);
    });
  });

  // -------------------------
  // POST /api/v1/users/setup
  // -------------------------
  describe('POST /api/v1/users/setup', () => {
    it('should create admin when no users exist', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // COUNT(*) = 0
        .mockResolvedValueOnce({ rows: [] });               // INSERT
      const res = await request(app).post('/api/v1/users/setup').send({ username: 'admin', password: 'admin_pass_123' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 403 when users already exist', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ count: '1' }] });
      const res = await request(app).post('/api/v1/users/setup').send({ username: 'admin', password: 'admin_pass_123' });
      expect(res.status).toBe(403);
    });

    it('should return 400 when credentials missing', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ count: '0' }] });
      const res = await request(app).post('/api/v1/users/setup').send({});
      expect(res.status).toBe(400);
    });

    it('should return 500 on DB error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app).post('/api/v1/users/setup').send({ username: 'admin', password: 'pass' });
      expect(res.status).toBe(500);
    });
  });

  // -------------------------
  // GET /api/v1/users/:id/export
  // -------------------------
  describe('GET /api/v1/users/:id/export', () => {
    it('should export user data', async () => {
      const fakeUser = { id: 1, username: 'admin_test', role: 'admin', created_at: new Date().toISOString() };
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [fakeUser] })
        .mockResolvedValueOnce({ rows: [] }); // notes
      const res = await request(app).get('/api/v1/users/1/export');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
    });

    it('should return 403 when exporting another user without admin', async () => {
      const mockReq = {
        user: { id: 3, username: 'student_test', role: 'student' },
        params: { id: '99' },
        cookies: {}, ip: '127.0.0.1', get: jest.fn(),
      } as any;
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      await UserController.exportData(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 when user not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/api/v1/users/999/export');
      expect(res.status).toBe(404);
    });

    it('should return 500 on DB error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app).get('/api/v1/users/1/export');
      expect(res.status).toBe(500);
    });
  });

  // -------------------------
  // DELETE /api/v1/users/:id
  // -------------------------
  describe('DELETE /api/v1/users/:id', () => {
    it('should soft-delete a user', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const res = await request(app).delete('/api/v1/users/2');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 500 on DB error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app).delete('/api/v1/users/2');
      expect(res.status).toBe(500);
    });
  });

  // -------------------------
  // GET /api/v1/users/:id/profile
  // -------------------------
  describe('GET /api/v1/users/:id/profile', () => {
    it('should return profile when it exists', async () => {
      const fakeProfile = { user_id: 1, username: 'admin_test', role: 'admin', classe: 'A', tags: [] };
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [fakeProfile] });
      const res = await request(app).get('/api/v1/users/1/profile');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('username', 'admin_test');
    });

    it('should return user info when no profile but user exists', async () => {
      const fakeUser = { id: 2, username: 'teacher_test', role: 'teacher' };
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })       // no profile
        .mockResolvedValueOnce({ rows: [fakeUser] }); // user found
      const res = await request(app).get('/api/v1/users/2/profile');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('profile', null);
    });

    it('should return 404 when user does not exist', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // no profile
        .mockResolvedValueOnce({ rows: [] }); // no user
      const res = await request(app).get('/api/v1/users/999/profile');
      expect(res.status).toBe(404);
    });

    it('should return 500 on DB error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app).get('/api/v1/users/1/profile');
      expect(res.status).toBe(500);
    });
  });

  // -------------------------
  // PUT /api/v1/users/:id/profile
  // -------------------------
  describe('PUT /api/v1/users/:id/profile', () => {
    let mockClient: any;

    beforeEach(() => {
      mockClient = { query: jest.fn(), release: jest.fn() };
      (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    });

    it('should update profile successfully', async () => {
      const fakeProfile = { user_id: 1, classe: 'A', username: 'admin_test', role: 'admin', tags: [] };
      mockClient.query
        .mockResolvedValueOnce(undefined)             // BEGIN
        .mockResolvedValueOnce(undefined)             // UPSERT profile
        .mockResolvedValueOnce(undefined)             // COMMIT
        .mockResolvedValueOnce({ rows: [fakeProfile] }); // SELECT updated profile
      const res = await request(app).put('/api/v1/users/1/profile').send({ classe: 'A', promotion: '2024', niveau: 'L1' });
      expect(res.status).toBe(200);
    });

    it('should return 403 when updating another users profile without admin', async () => {
      const mockReq = {
        user: { id: 3, username: 'student_test', role: 'student' },
        params: { id: '99' },
        body: { classe: 'B' },
        cookies: {}, ip: '127.0.0.1', get: jest.fn(),
      } as any;
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      await UserController.updateUserProfile(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 on DB error', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app).put('/api/v1/users/1/profile').send({ classe: 'A', promotion: '2024', niveau: 'L1' });
      expect(res.status).toBe(500);
    });
  });
});
