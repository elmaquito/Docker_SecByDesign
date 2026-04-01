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
    req.user = { id: 1, username: 'admin_test', role: 'admin' };
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
import * as NotesController from '../src/notes/notes.controller';

describe('Notes API (unit tests - mocked DB)', () => {
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
    // Since we are mocking the middleware, we need to ensure the user is set for all routes
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.user = { id: 1, username: 'admin_test', role: 'admin' };
      next();
    });
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

    it('should return 404 when note not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const res = await request(app).patch('/api/v1/notes/999').send({ title: 'Title' });
      expect(res.status).toBe(404);
    });

    it('should return 403 when not owner and not admin', async () => {
      const existingNote = { id: 2, user_id: 99, owner_role: 'student' };
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [existingNote] });
      const mockReq = {
        user: { id: 5, username: 'student_x', role: 'student' },
        params: { id: '2' },
        body: { title: 'Hack' },
        cookies: {}, ip: '127.0.0.1', get: jest.fn(),
      } as any;
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      await NotesController.updateNote(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 for invalid ID', async () => {
      const res = await request(app).patch('/api/v1/notes/abc').send({ title: 'x' });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------
  // GET /api/v1/notes (teacher & student roles)
  // -------------------------
  describe('GET /api/v1/notes as teacher', () => {
    let teacherApp: express.Application;
    beforeEach(() => {
      teacherApp = express();
      teacherApp.use(express.json());
      teacherApp.use((req: Request, _res: Response, next: NextFunction) => {
        req.user = { id: 2, username: 'teacher_test', role: 'teacher' };
        next();
      });
      teacherApp.use('/api/v1/notes', noteRoutes);
    });

    it('should return notes for teacher role', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const res = await request(teacherApp).get('/api/v1/notes');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/notes as student', () => {
    let studentApp: express.Application;
    beforeEach(() => {
      studentApp = express();
      studentApp.use(express.json());
      studentApp.use((req: Request, _res: Response, next: NextFunction) => {
        req.user = { id: 3, username: 'student_test', role: 'student' };
        next();
      });
      studentApp.use('/api/v1/notes', noteRoutes);
    });

    it('should return notes for student role', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const res = await request(studentApp).get('/api/v1/notes');
      expect(res.status).toBe(200);
    });
  });

  // -------------------------
  // DELETE /api/v1/notes/:id
  // -------------------------
  describe('DELETE /api/v1/notes/:id', () => {
    it('should delete a note as owner', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }] }) // SELECT ownership
        .mockResolvedValueOnce({ rows: [] });               // DELETE

      const res = await request(app).delete('/api/v1/notes/1');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Deleted');
    });

    it('should return 403 when not owner and not admin', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ user_id: 99 }] });
      const mockReq = {
        user: { id: 5, username: 'student_x', role: 'student' },
        params: { id: '1' },
        cookies: {}, ip: '127.0.0.1', get: jest.fn(),
      } as any;
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      await NotesController.deleteNote(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 when note does not exist', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const res = await request(app).delete('/api/v1/notes/999');
      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid ID', async () => {
      const res = await request(app).delete('/api/v1/notes/abc');
      expect(res.status).toBe(400);
    });

    it('should return 500 on DB error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app).delete('/api/v1/notes/1');
      expect(res.status).toBe(500);
    });
  });

  // -------------------------
  // GET /api/v1/notes/:id (additional cases)
  // -------------------------
  describe('GET /api/v1/notes/:id (access control)', () => {
    it('should allow teacher to see student note', async () => {
      const fakeNote = {
        id: 5, user_id: 10, owner_role: 'student', owner_username: 'student_test',
        title: 'Student Note', content: 'content', created_at: new Date().toISOString(),
        theme_id: null, theme_name: null, theme_color: null,
        category_id: null, category_name: null,
        reactions_up: 0, reactions_down: 0, view_count: 0, pinned: false, urgent: false,
      };
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [fakeNote] });

      const teacherApp = express();
      teacherApp.use(express.json());
      teacherApp.use((req: Request, _res: Response, next: NextFunction) => {
        req.user = { id: 2, username: 'teacher_test', role: 'teacher' };
        next();
      });
      teacherApp.use('/api/v1/notes', noteRoutes);

      const res = await request(teacherApp).get('/api/v1/notes/5');
      expect(res.status).toBe(200);
    });

    it('should return 403 when student accesses another users note', async () => {
      const fakeNote = {
        id: 6, user_id: 99, owner_role: 'student', owner_username: 'other_student',
        title: 'Private Note', content: 'content', created_at: new Date().toISOString(),
        theme_id: null, theme_name: null, theme_color: null,
        category_id: null, category_name: null,
        reactions_up: 0, reactions_down: 0, view_count: 0, pinned: false, urgent: false,
      };
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [fakeNote] });
      const mockReq = {
        user: { id: 3, username: 'student_test', role: 'student' },
        params: { id: '6' },
        cookies: {}, ip: '127.0.0.1', get: jest.fn(),
      } as any;
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      await NotesController.getNote(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 on DB error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app).get('/api/v1/notes/1');
      expect(res.status).toBe(500);
    });
  });

  // -------------------------
  // Reactions
  // -------------------------
  describe('POST /api/v1/notes/:id/reactions', () => {
    it('should add a reaction', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })   // no existing reaction
        .mockResolvedValueOnce({ rows: [] });   // upsert

      const res = await request(app).post('/api/v1/notes/1/reactions').send({ reaction_type: 'up' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Reaction added');
    });

    it('should toggle off when same reaction exists', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ reaction_type: 'up' }] }) // existing same reaction
        .mockResolvedValueOnce({ rows: [] });                        // delete

      const res = await request(app).post('/api/v1/notes/1/reactions').send({ reaction_type: 'up' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('toggled', true);
    });

    it('should return 400 for invalid reaction type', async () => {
      const res = await request(app).post('/api/v1/notes/1/reactions').send({ reaction_type: 'invalid' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid note ID', async () => {
      const res = await request(app).post('/api/v1/notes/abc/reactions').send({ reaction_type: 'up' });
      expect(res.status).toBe(400);
    });

    it('should return 500 on DB error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app).post('/api/v1/notes/1/reactions').send({ reaction_type: 'down' });
      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/v1/notes/:id/reactions/me', () => {
    it('should return existing reaction', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ reaction_type: 'up' }] });
      const res = await request(app).get('/api/v1/notes/1/reactions/me');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('reaction', 'up');
    });

    it('should return null when no reaction', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/api/v1/notes/1/reactions/me');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('reaction', null);
    });

    it('should return 400 for invalid note ID', async () => {
      const res = await request(app).get('/api/v1/notes/abc/reactions/me');
      expect(res.status).toBe(400);
    });
  });

  // -------------------------
  // Comments (not implemented)
  // -------------------------
  describe('GET /api/v1/notes/:id/comments', () => {
    it('should return 501 not implemented', async () => {
      const res = await request(app).get('/api/v1/notes/1/comments');
      expect(res.status).toBe(501);
    });
  });

  describe('POST /api/v1/notes/:id/comments', () => {
    it('should return 501 not implemented', async () => {
      const res = await request(app).post('/api/v1/notes/1/comments').send({ text: 'hello' });
      expect(res.status).toBe(501);
    });
  });

  // -------------------------
  // Note Tags (via notes routes)
  // -------------------------
  describe('GET /api/v1/notes/:id/tags', () => {
    it('should return tags for a note', async () => {
      const fakeTags = [{ id: 1, name: 'Math', type: 'categorie' }];
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: fakeTags });
      const res = await request(app).get('/api/v1/notes/1/tags');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 500 on DB error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app).get('/api/v1/notes/1/tags');
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/v1/notes/:id/tags', () => {
    it('should update note tags successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined)  // BEGIN
        .mockResolvedValueOnce(undefined)  // DELETE note_tags
        .mockResolvedValueOnce(undefined)  // INSERT note_tags
        .mockResolvedValueOnce(undefined); // COMMIT
      const res = await request(app).post('/api/v1/notes/1/tags').send({ tagIds: [1, 2] });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Tags updated');
    });

    it('should return 400 when tagIds is not an array', async () => {
      const res = await request(app).post('/api/v1/notes/1/tags').send({ tagIds: 'not-array' });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------
  // POST note with category & tags
  // -------------------------
  describe('POST /api/v1/notes with extras', () => {
    it('should create note with category_id', async () => {
      const newNote = { id: 20, title: 'Cat Note', content: 'content here okay' };
      mockClient.query
        .mockResolvedValueOnce(undefined)           // BEGIN
        .mockResolvedValueOnce({ rows: [newNote] }) // INSERT notes
        .mockResolvedValueOnce(undefined)           // INSERT note_categories
        .mockResolvedValueOnce(undefined);          // COMMIT
      const res = await request(app).post('/api/v1/notes').send({ title: 'Cat Note', content: 'content here okay', category_id: 2 });
      expect(res.status).toBe(201);
    });

    it('should return 500 on DB error during create', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app).post('/api/v1/notes').send({ title: 'Fail Note', content: 'content that fails here' });
      expect(res.status).toBe(500);
    });
  });
});
