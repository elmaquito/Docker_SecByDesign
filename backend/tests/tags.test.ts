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

    it('should return 409 when tag already exists', async () => {
      const err: any = new Error('Duplicate'); err.code = '23505';
      (pool.query as jest.Mock).mockRejectedValueOnce(err);
      const res = await request(app).post('/api/v1/tags').send({ type: 'classe', name: 'Dupe' });
      expect(res.status).toBe(409);
    });

    it('should return 500 on unexpected DB error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app).post('/api/v1/tags').send({ type: 'classe', name: 'ErrorTag' });
      expect(res.status).toBe(500);
    });
  });

  // -------------------------
  // PATCH /api/v1/tags/:id
  // -------------------------
  describe('PATCH /api/v1/tags/:id', () => {
    it('should update a tag name', async () => {
      const updated = { id: 1, type: 'classe', name: 'Renamed', meta: {} };
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [updated] });
      const res = await request(app).patch('/api/v1/tags/1').send({ name: 'Renamed' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name', 'Renamed');
    });

    it('should return 200 with no-change message when no fields given', async () => {
      const res = await request(app).patch('/api/v1/tags/1').send({});
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'No changes');
    });

    it('should return 404 when tag not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const res = await request(app).patch('/api/v1/tags/999').send({ name: 'Ghost' });
      expect(res.status).toBe(404);
    });

    it('should return 500 on DB error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app).patch('/api/v1/tags/1').send({ name: 'Fail' });
      expect(res.status).toBe(500);
    });
  });

  // -------------------------
  // DELETE /api/v1/tags/:id
  // -------------------------
  describe('DELETE /api/v1/tags/:id', () => {
    it('should delete a tag', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const res = await request(app).delete('/api/v1/tags/1');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Deleted');
    });

    it('should return 404 when tag not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const res = await request(app).delete('/api/v1/tags/999');
      expect(res.status).toBe(404);
    });

    it('should return 500 on DB error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app).delete('/api/v1/tags/1');
      expect(res.status).toBe(500);
    });
  });
});
