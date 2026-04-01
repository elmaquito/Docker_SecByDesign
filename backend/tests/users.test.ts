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
  });
});
