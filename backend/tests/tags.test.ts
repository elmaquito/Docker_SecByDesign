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

import tagRoutes from '../src/tags/tags.routes';

describe('Tags API (unit tests - mocked DB)', () => {
  let app: express.Application;
  let pool: any;
  let mockClient: any;

  beforeEach(() => {
    pool = new Pool();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);

    app = express();
    app.use(express.json());
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.user = { id: 1, username: 'admin_test', role: 'admin' };
      next();
    });
    app.use('/api/v1/tags', tagRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------
  // GET /api/v1/tags
  // -------------------------
  describe('GET /api/v1/tags', () => {
    it('should return all tags', async () => {
      const fakeTags = [
        { id: 1, type: 'categorie', name: 'Mathématiques', meta: {}, is_default_for_student_view: true },
        { id: 2, type: 'classe', name: '6ème A', meta: {}, is_default_for_student_view: false },
      ];
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: fakeTags });

      const res = await request(app).get('/api/v1/tags');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toHaveProperty('name', 'Mathématiques');
    });

    it('should return 500 when DB query fails', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app).get('/api/v1/tags');
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'Internal error');
    });
  });

  // -------------------------
  // POST /api/v1/tags
  // -------------------------
  describe('POST /api/v1/tags', () => {
    it('should create a tag successfully', async () => {
      const newTag = { id: 1, type: 'categorie', name: 'Sciences', meta: { color: '#ff0000' }, is_default_for_student_view: true };
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [newTag] });

      const res = await request(app)
        .post('/api/v1/tags')
        .send({ type: 'categorie', name: 'Sciences', meta: { color: '#ff0000' }, is_default_for_student_view: true });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id', 1);
      expect(res.body).toHaveProperty('name', 'Sciences');
    });

    it('should return 400 for invalid tag type', async () => {
      const res = await request(app)
        .post('/api/v1/tags')
        .send({ type: 'invalid_type', name: 'Bad Tag' });

      expect(res.status).toBe(400);
    });
  });
});
