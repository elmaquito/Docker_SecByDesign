import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

// Mock pg Pool before importing routes
jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  const mPool = {
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue(mockClient),
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

// Mock AuditLogger to avoid DB calls during audit logging
jest.mock('../src/common/audit', () => ({
  AuditLogger: {
    log: jest.fn().mockResolvedValue(undefined),
  },
}));

import noteRoutes from '../src/notes/notes.routes';

describe('Notes API (unit tests - mocked DB)', () => {
  let app: express.Application;
  let pool: Pool;
  let mockClient: { query: jest.Mock, release: jest.Mock };

  beforeEach(() => {
    pool = new Pool();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);

    app = express();
    app.use(express.json());
    app.use('/api/v1/notes', noteRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------
  // GET /api/v1/notes
  // -------------------------
  describe('GET /api/v1/notes', () => {
    it('should return a list of notes for admin', async () => {
      const fakeNotes = [
        {
          id: 1, user_id: 2, title: 'Admin Note', content: 'Content here', created_at: new Date().toISOString(),
          owner_role: 'teacher', owner_username: 'teacher_test',
          theme_id: null, theme_name: null, theme_color: null,
          category_id: null, category_name: null,
          tags: null, reactions_up: 0, reactions_down: 0, view_count: 0, pinned: false, urgent: false,
        },
      ];
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: fakeNotes });

      const res = await request(app).get('/api/v1/notes');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('title', 'Admin Note');
    });

    it('should return 500 when DB query fails', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app).get('/api/v1/notes');
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'Internal error');
    });
  });

  // -------------------------
  // POST /api/v1/notes
  // -------------------------
  describe('POST /api/v1/notes', () => {
    it('should create a note successfully', async () => {
      const newNote = { id: 10, title: 'New Note', content: 'This is content here.', created_at: new Date().toISOString() };
      mockClient.query
        .mockResolvedValueOnce(undefined)           // BEGIN
        .mockResolvedValueOnce({ rows: [newNote] }) // INSERT INTO notes
        .mockResolvedValueOnce(undefined);           // COMMIT

      const res = await request(app)
        .post('/api/v1/notes')
        .send({ title: 'New Note', content: 'This is content here.' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id', 10);
      expect(res.body).toHaveProperty('title', 'New Note');
    });

    it('should return 400 on invalid input (title too short)', async () => {
      const res = await request(app)
        .post('/api/v1/notes')
        .send({ title: 'AB', content: 'Short' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should create a note with theme_id', async () => {
      const newNote = { id: 11, title: 'Themed Note', content: 'Content for theme test.', created_at: new Date().toISOString() };
      mockClient.query
        .mockResolvedValueOnce(undefined)            // BEGIN
        .mockResolvedValueOnce({ rows: [newNote] }) // INSERT INTO notes
        .mockResolvedValueOnce(undefined)            // INSERT INTO note_themes
        .mockResolvedValueOnce(undefined);           // COMMIT

      const res = await request(app)
        .post('/api/v1/notes')
        .send({ title: 'Themed Note', content: 'Content for theme test.', theme_id: 1 });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('theme_id', 1);
    });
  });

  // -------------------------
  // GET /api/v1/notes/:id
  // -------------------------
  describe('GET /api/v1/notes/:id', () => {
    it('should return a single note by ID', async () => {
      const fakeNote = {
        id: 1, user_id: 1, title: 'My Note', content: 'Some content', created_at: new Date().toISOString(),
        owner_username: 'admin_test', owner_role: 'admin',
        theme_id: null, theme_name: null, theme_color: null,
        category_id: null, category_name: null,
        reactions_up: 5, reactions_down: 2, view_count: 10, pinned: false, urgent: false,
      };
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [fakeNote] });

      const res = await request(app).get('/api/v1/notes/1');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 1);
      expect(res.body).toHaveProperty('title', 'My Note');
      expect(res.body).toHaveProperty('reactions_up', 5);
    });

    it('should return 404 when note not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/v1/notes/999');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Not found');
    });

    it('should return 400 for invalid ID (NaN)', async () => {
      const res = await request(app).get('/api/v1/notes/abc');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid ID');
    });
  });

  // -------------------------
  // PATCH /api/v1/notes/:id
  // -------------------------
  describe('PATCH /api/v1/notes/:id', () => {
    it('should update a note successfully', async () => {
      const existingNote = { id: 1, user_id: 1, owner_role: 'admin' };
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [existingNote] }); // SELECT to check ownership

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // UPDATE notes
        .mockResolvedValueOnce(undefined); // COMMIT

      const res = await request(app)
        .patch('/api/v1/notes/1')
        .send({ title: 'Updated Title', content: 'Updated content here.' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Updated');
      expect(res.body).toHaveProperty('id', 1);
    });

    it('should return 404 when note not found for update', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .patch('/api/v1/notes/999')
        .send({ title: 'Nope' });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Not found');
    });

    it('should return 400 for invalid note ID', async () => {
      const res = await request(app).patch('/api/v1/notes/xyz').send({ title: 'X' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid ID');
    });
  });

  // -------------------------
  // DELETE /api/v1/notes/:id
  // -------------------------
  describe('DELETE /api/v1/notes/:id', () => {
    it('should delete a note successfully (admin)', async () => {
      const existingNote = { user_id: 2 }; // Different user but admin can delete
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [existingNote] }) // SELECT note
        .mockResolvedValueOnce({ rows: [] });            // DELETE note

      const res = await request(app).delete('/api/v1/notes/1');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Deleted');
    });

    it('should return 404 when note does not exist', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const res = await request(app).delete('/api/v1/notes/999');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Not found');
    });

    it('should return 400 for invalid ID', async () => {
      const res = await request(app).delete('/api/v1/notes/abc');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid ID');
    });
  });

  // -------------------------
  // RBAC: Student cannot delete another's note
  // -------------------------
  describe('RBAC: Note ownership enforcement', () => {
    it('should return 403 when a student tries to delete a note they do not own', async () => {
      // Create an app that directly uses the controller with a student user (bypassing route middleware)
      const { deleteNote, updateNote } = await import('../src/notes/notes.controller');

      const rbacApp = express();
      rbacApp.use(express.json());

      // Inject student user directly
      rbacApp.use((req: Request, _res: Response, next: NextFunction) => {
        (req as Request & { user: object }).user = { id: 99, username: 'student_test', role: 'student' };
        next();
      });

      rbacApp.delete('/notes/:id', deleteNote);
      rbacApp.patch('/notes/:id', updateNote);

      // Note owned by user_id = 1, but student is user_id = 99
      const ownedByOtherUser = { user_id: 1 };
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [ownedByOtherUser] });

      const res = await request(rbacApp).delete('/notes/1');
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Forbidden');
    });

    it('should return 403 when a student tries to update a note they do not own', async () => {
      const { updateNote } = await import('../src/notes/notes.controller');

      const rbacApp = express();
      rbacApp.use(express.json());
      rbacApp.use((req: Request, _res: Response, next: NextFunction) => {
        (req as Request & { user: object }).user = { id: 99, username: 'student_test', role: 'student' };
        next();
      });
      rbacApp.patch('/notes/:id', updateNote);

      // Note owned by user_id = 1, owner_role = admin
      const ownedByOtherUser = { id: 1, user_id: 1, owner_role: 'admin' };
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [ownedByOtherUser] });

      const res = await request(rbacApp)
        .patch('/notes/1')
        .send({ title: 'Hacked', content: 'Unauthorized update attempt here.' });
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Forbidden');
    });
  });
});
