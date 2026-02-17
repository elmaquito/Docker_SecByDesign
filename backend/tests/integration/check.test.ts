
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { createThemeRouter } from '../../src/themes/theme.routes';
import { createCategoryRouter } from '../../src/categories/category.routes';

// Mock pg Pool
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    connect: jest.fn(),
    on: jest.fn(),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

// Mock Middleware
const mockAuthenticate = (req: any, res: Response, next: NextFunction) => {
  req.user = { id: 1, role: 'admin' }; // Mock admin user
  next();
};

const mockAuthorize = (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  next(); // Always authorize in this test suite
};

describe('API Integration Tests', () => {
  let app: express.Application;
  let pool: Pool;

  beforeEach(() => {
    pool = new Pool();
    app = express();
    app.use(express.json());
    app.use('/api/themes', createThemeRouter(pool, mockAuthenticate, mockAuthorize));
    app.use('/api/categories', createCategoryRouter(pool, mockAuthenticate, mockAuthorize));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Themes API', () => {
    it('GET /api/themes should return all themes', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1, name: 'Theme 1' }] });
      const res = await request(app).get('/api/themes');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 1, name: 'Theme 1' }]);
    });

    it('POST /api/themes should create a theme', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1, name: 'New Theme' }] });
      const res = await request(app).post('/api/themes').send({ name: 'New Theme' });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: 1, name: 'New Theme' });
    });

    it('PUT /api/themes/:id should update a theme', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1, name: 'Updated Theme' }] });
        const res = await request(app).put('/api/themes/1').send({ name: 'Updated Theme' });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: 1, name: 'Updated Theme' });
    });

    it('DELETE /api/themes/:id should delete a theme', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
        const res = await request(app).delete('/api/themes/1');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: 'Theme deleted' });
    });
  });

  describe('Categories API', () => {
    it('GET /api/categories should return all categories', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1, name: 'Category 1' }] });
      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 1, name: 'Category 1' }]);
    });

    it('POST /api/categories should create a category', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1, name: 'New Category' }] });
        const res = await request(app).post('/api/categories').send({ name: 'New Category', target_type: 'classe', target_value: '6A' });
        expect(res.status).toBe(201);
        expect(res.body).toEqual({ id: 1, name: 'New Category' });
    });

    it('PUT /api/categories/:id should update a category', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1, name: 'Updated Category' }] });
        const res = await request(app).put('/api/categories/1').send({ name: 'Updated Category' });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: 1, name: 'Updated Category' });
    });

    it('DELETE /api/categories/:id should delete a category', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
        const res = await request(app).delete('/api/categories/1');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: 'Category deleted' });
    });
  });
});
