import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Pool } from 'pg';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// --- Configuration ---
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
const DB_CONFIG = {
  host: process.env.DB_HOST || 'database',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'dev_secret_password',
  database: process.env.DB_NAME || 'notimatic_dev',
};

// --- Database ---
const pool = new Pool(DB_CONFIG);

// --- Types ---
type Role = 'admin' | 'technician' | 'teacher' | 'student';

// --- Validation Schemas (Zod) ---
const userCreateSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, "Alphanumeric only"),
  password: z.string().min(12, "Password must be at least 12 chars"),
  role: z.enum(['admin', 'technician', 'teacher', 'student']).default('student'),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const noteSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().optional(),
});

// --- App Setup ---
const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// --- Middleware ---

// 1. Authenticate (Verify JWT)
const authenticateToken = (req: any, res: Response, next: NextFunction) => {
  const token = req.cookies['auth_token'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

// 2. Authorize (Check Roles)
const authorize = (allowedRoles: Role[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (allowedRoles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
  };
};

// 3. Check Owner (Dynamic)
// Returns true if user is owner, false otherwise.
// This is a helper, not a middleware, to be used inside routes for granular control.
const isOwner = (resourceUserId: number, currentUserId: number) => {
  return resourceUserId === currentUserId;
};

// --- Routes (API v1) ---
const api = express.Router();

// Health
api.get('/health', (req, res) => {
  res.json({ status: 'ok', db: 'connected' });
});

// Auth: Login (Anonymous)
api.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user || !(await argon2.verify(user.password_hash, password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '15m' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000
    });

    res.json({ message: 'Logged in', user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Auth: Logout (Authenticated)
api.post('/auth/logout', authenticateToken, (req, res) => {
  res.clearCookie('auth_token');
  res.json({ message: 'Logged out' });
});

// Users: Create (Admin, Technician)
// NOTE: This replaces the public register endpoint.
api.post('/users', authenticateToken, authorize(['admin', 'technician']), async (req: any, res) => {
  try {
    const { username, password, role } = userCreateSchema.parse(req.body);
    const hash = await argon2.hash(password, { type: argon2.argon2id });

    const result = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, hash, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already exists' });
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Internal error' });
  }
});

// Users: List (Admin, Technician)
api.get('/users', authenticateToken, authorize(['admin', 'technician']), async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role, created_at FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Notes: List (Authenticated)
api.get('/notes', authenticateToken, async (req: any, res) => {
  try {
    // RBAC: Admin/Technician see all notes. Teachers see student notes.
    // Others see only their own notes.
    let query: string;
    let params: any[] = [];

    if (req.user.role === 'admin' || req.user.role === 'technician') {
      query = 'SELECT n.*, u.role AS owner_role FROM notes n JOIN users u ON n.user_id = u.id ORDER BY n.created_at DESC';
    } else if (req.user.role === 'teacher') {
      // Teachers can view notes belonging to students
      query = `SELECT n.*, u.role AS owner_role FROM notes n JOIN users u ON n.user_id = u.id WHERE u.role = 'student' ORDER BY n.created_at DESC`;
    } else {
      query = 'SELECT n.*, u.role AS owner_role FROM notes n JOIN users u ON n.user_id = u.id WHERE n.user_id = $1 ORDER BY n.created_at DESC';
      params = [req.user.id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows.map((r: any) => ({ id: r.id, user_id: r.user_id, title: r.title, content: r.content, created_at: r.created_at, owner_role: r.owner_role })));
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Notes: Create (Teacher, Student, Admin)
api.post('/notes', authenticateToken, authorize(['teacher', 'student', 'admin']), async (req: any, res) => {
  try {
    const { title, content } = noteSchema.parse(req.body);
    const result = await pool.query(
      'INSERT INTO notes (user_id, title, content) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, title, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Internal error' });
  }
});

// Notes: Read (Admin, Technician, Owner, Teacher, Student)
api.get('/notes/:id', authenticateToken, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query('SELECT n.*, u.role AS owner_role FROM notes n JOIN users u ON n.user_id = u.id WHERE n.id = $1', [id]);
    const note = result.rows[0];

    if (!note) return res.status(404).json({ error: 'Not found' });

    // RBAC Check
    const isAllowed =
      req.user.role === 'admin' ||
      req.user.role === 'technician' ||
      isOwner(note.user_id, req.user.id) ||
      (req.user.role === 'teacher' && note.owner_role === 'student');

    if (!isAllowed) return res.status(403).json({ error: 'Forbidden' });

    res.json({ id: note.id, user_id: note.user_id, title: note.title, content: note.content, created_at: note.created_at, owner_role: note.owner_role });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Notes: Update (Owner, Admin, Teacher for student notes)
api.patch('/notes/:id', authenticateToken, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, content } = req.body;
    const result = await pool.query('SELECT n.*, u.role AS owner_role FROM notes n JOIN users u ON n.user_id = u.id WHERE n.id = $1', [id]);
    const note = result.rows[0];

    if (!note) return res.status(404).json({ error: 'Not found' });

    const canEdit =
      req.user.role === 'admin' ||
      isOwner(note.user_id, req.user.id) ||
      (req.user.role === 'teacher' && note.owner_role === 'student');

    if (!canEdit) return res.status(403).json({ error: 'Forbidden' });

    const upd = await pool.query('UPDATE notes SET title = $1, content = $2 WHERE id = $3 RETURNING *', [title ?? note.title, content ?? note.content, id]);
    res.json(upd.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Comments: List for a note
api.get('/notes/:id/comments', authenticateToken, async (req: any, res) => {
  try {
    const noteId = parseInt(req.params.id);
    // reuse note RBAC: allow if note readable
    const noteRes = await pool.query('SELECT n.*, u.role AS owner_role FROM notes n JOIN users u ON n.user_id = u.id WHERE n.id = $1', [noteId]);
    const note = noteRes.rows[0];
    if (!note) return res.status(404).json({ error: 'Not found' });
    const isAllowed = req.user.role === 'admin' || req.user.role === 'technician' || isOwner(note.user_id, req.user.id) || (req.user.role === 'teacher' && note.owner_role === 'student');
    if (!isAllowed) return res.status(403).json({ error: 'Forbidden' });

    const result = await pool.query('SELECT c.id, c.content, c.user_id, u.username, c.created_at FROM comments c JOIN users u ON c.user_id = u.id WHERE c.note_id = $1 ORDER BY c.created_at ASC', [noteId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Comments: Create (Authenticated users who can view the note)
api.post('/notes/:id/comments', authenticateToken, async (req: any, res) => {
  try {
    const noteId = parseInt(req.params.id);
    const { content } = req.body;
    const noteRes = await pool.query('SELECT n.*, u.role AS owner_role FROM notes n JOIN users u ON n.user_id = u.id WHERE n.id = $1', [noteId]);
    const note = noteRes.rows[0];
    if (!note) return res.status(404).json({ error: 'Not found' });
    const isAllowed = req.user.role === 'admin' || req.user.role === 'technician' || isOwner(note.user_id, req.user.id) || (req.user.role === 'teacher' && note.owner_role === 'student');
    if (!isAllowed) return res.status(403).json({ error: 'Forbidden' });

    const result = await pool.query('INSERT INTO comments (note_id, user_id, content) VALUES ($1, $2, $3) RETURNING id, note_id, user_id, content, created_at', [noteId, req.user.id, content]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Notes: Delete (Admin, Owner)
api.delete('/notes/:id', authenticateToken, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query('SELECT * FROM notes WHERE id = $1', [id]);
    const note = result.rows[0];

    if (!note) return res.status(404).json({ error: 'Not found' });

    const isAllowed = 
      req.user.role === 'admin' || 
      isOwner(note.user_id, req.user.id);

    if (!isAllowed) return res.status(403).json({ error: 'Forbidden' });

    await pool.query('DELETE FROM notes WHERE id = $1', [id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Setup Route (Dev Only - Create Initial Admin)
api.post('/setup', async (req, res) => {
  try {
    const countRes = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(countRes.rows[0].count) > 0) {
      return res.status(403).json({ error: 'Setup already completed' });
    }

    // Validate input, forcing role to admin
    const { username, password } = userCreateSchema.parse({ ...req.body, role: 'admin' });

    const hash = await argon2.hash(password, { type: argon2.argon2id });
    await pool.query(
      "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'admin')",
      [username, hash]
    );
    res.json({ message: `Admin created (${username})` });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Internal error' });
  }
});

// Themes: List (Authenticated)
api.get('/themes', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM themes ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching themes:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Categories: List (Authenticated)
api.get('/categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Mount API
app.use('/api/v1', api);

// Legacy Redirects (for frontend compatibility if needed, though we should update frontend)
// app.use('/notes', ...); 

app.listen(PORT, () => {
  console.log(`Secure Backend running on port ${PORT}`);
});

