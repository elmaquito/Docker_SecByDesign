import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Pool } from 'pg';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import crypto from 'crypto';

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

const passwordResetRequestSchema = z.object({
  username: z.string().min(1),
});

const passwordResetCompleteSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(12, "Password must be at least 12 chars"),
});

const accountUpdateSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  password: z.string().min(12, "Password must be at least 12 chars").optional(),
});

const tagSchema = z.object({
  type: z.enum(['classe', 'specialite', 'groupe', 'categorie']),
  name: z.string().min(1).max(100),
  meta: z.object({}).passthrough().optional(),
  is_default_for_student_view: z.boolean().optional(),
});

const reactionSchema = z.object({
  reaction_type: z.enum(['up', 'down']),
});

// --- Helper Functions ---

// Generate secure random token
const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Hash token for storage
const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Send email (console log for MVP)
const sendEmail = async (to: string, subject: string, body: string) => {
  console.log('📧 Email sent:');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  // In production, use nodemailer or SendGrid
};

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
api.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', db: 'connected' });
});

// Auth: Login (Anonymous)
api.post('/auth/login', async (req: Request, res: Response) => {
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
api.post('/auth/logout', authenticateToken, (req: Request, res: Response) => {
  res.clearCookie('auth_token');
  res.json({ message: 'Logged out' });
});

// Auth: Password Reset Request
api.post('/auth/password-reset/request', async (req: Request, res: Response) => {
  try {
    const { username } = passwordResetRequestSchema.parse(req.body);
    
    // Find user by username
    const result = await pool.query(
      'SELECT id, username, email FROM users WHERE username = $1',
      [username]
    );
    
    // Always return success (don't reveal if user exists)
    if (result.rows.length === 0) {
      return res.json({ 
        message: 'If an account exists with this username, a password reset link has been sent.' 
      });
    }
    
    const user = result.rows[0];
    
    // Generate token
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Store token
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip_address) VALUES ($1, $2, $3, $4)',
      [user.id, tokenHash, expiresAt, req.ip]
    );
    
    // Create reset link
    const resetLink = `http://localhost:5173/reset-password?token=${token}`;
    
    // Send email (console log for MVP)
    await sendEmail(
      user.email || user.username,
      'Password Reset Request',
      `Click here to reset your password: ${resetLink}\n\nThis link expires in 1 hour.`
    );
    
    res.json({ 
      message: 'If an account exists with this username, a password reset link has been sent.',
      resetLink // Only for MVP/dev - remove in production
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    console.error('Password reset request error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Auth: Password Reset Complete
api.post('/auth/password-reset/complete', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = passwordResetCompleteSchema.parse(req.body);
    
    const tokenHash = hashToken(token);
    
    // Find valid token
    const result = await pool.query(
      `SELECT prt.*, u.id as user_id, u.username 
       FROM password_reset_tokens prt 
       JOIN users u ON prt.user_id = u.id 
       WHERE prt.token_hash = $1 
         AND prt.expires_at > NOW() 
         AND prt.used_at IS NULL`,
      [tokenHash]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    const resetToken = result.rows[0];
    
    // Hash new password
    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    
    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, resetToken.user_id]
    );
    
    // Mark token as used
    await pool.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
      [resetToken.id]
    );
    
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    console.error('Password reset complete error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
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
api.get('/users', authenticateToken, authorize(['admin', 'technician']), async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, username, role, created_at FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Notes: List (Authenticated)
api.get('/notes', authenticateToken, async (req: any, res: Response) => {
  try {
    // RBAC: Admin/Technician see all notes. Teachers see student notes.
    // Others see only their own notes.
    let query: string;
    let params: any[] = [];

    if (req.user.role === 'admin' || req.user.role === 'technician') {
      query = `SELECT n.*, u.role AS owner_role, u.username as owner_username
               FROM notes n 
               JOIN users u ON n.user_id = u.id 
               ORDER BY n.created_at DESC`;
    } else if (req.user.role === 'teacher') {
      // Teachers can view notes belonging to students
      query = `SELECT n.*, u.role AS owner_role, u.username as owner_username
               FROM notes n 
               JOIN users u ON n.user_id = u.id 
               WHERE u.role = 'student' 
               ORDER BY n.created_at DESC`;
    } else {
      query = `SELECT n.*, u.role AS owner_role, u.username as owner_username
               FROM notes n 
               JOIN users u ON n.user_id = u.id 
               WHERE n.user_id = $1 
               ORDER BY n.created_at DESC`;
      params = [req.user.id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows.map((r: any) => ({ 
      id: r.id, 
      user_id: r.user_id, 
      title: r.title, 
      content: r.content, 
      created_at: r.created_at, 
      owner_role: r.owner_role,
      owner_username: r.owner_username,
      reactions_up: r.reactions_up || 0,
      reactions_down: r.reactions_down || 0
    })));
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Notes: Create (Teacher, Student, Admin)
api.post('/notes', authenticateToken, authorize(['teacher', 'student', 'admin']), async (req: any, res: Response) => {
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
api.get('/notes/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query(
      'SELECT n.*, u.role AS owner_role, u.username as owner_username FROM notes n JOIN users u ON n.user_id = u.id WHERE n.id = $1', 
      [id]
    );
    const note = result.rows[0];

    if (!note) return res.status(404).json({ error: 'Not found' });

    // RBAC Check
    const isAllowed =
      req.user.role === 'admin' ||
      req.user.role === 'technician' ||
      isOwner(note.user_id, req.user.id) ||
      (req.user.role === 'teacher' && note.owner_role === 'student');

    if (!isAllowed) return res.status(403).json({ error: 'Forbidden' });

    res.json({ 
      id: note.id, 
      user_id: note.user_id, 
      title: note.title, 
      content: note.content, 
      created_at: note.created_at, 
      owner_role: note.owner_role,
      owner_username: note.owner_username,
      reactions_up: note.reactions_up || 0,
      reactions_down: note.reactions_down || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Notes: Update (Owner, Admin, Teacher for student notes)
api.patch('/notes/:id', authenticateToken, async (req: any, res: Response) => {
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
api.get('/notes/:id/comments', authenticateToken, async (req: any, res: Response) => {
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
api.post('/notes/:id/comments', authenticateToken, async (req: any, res: Response) => {
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
api.delete('/notes/:id', authenticateToken, async (req: any, res: Response) => {
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
api.post('/setup', async (req: Request, res: Response) => {
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
api.get('/themes', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM themes ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching themes:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Categories: List (Authenticated)
api.get('/categories', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Account: Get Current User Info
api.get('/account', authenticateToken, async (req: any, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, phone, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching account:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Account: Update (Non-students only)
api.patch('/account', authenticateToken, async (req: any, res: Response) => {
  try {
    // Students cannot edit their account
    if (req.user.role === 'student') {
      return res.status(403).json({ error: 'Students cannot edit their account information' });
    }
    
    const { email, phone, password } = accountUpdateSchema.parse(req.body);
    
    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    
    if (password !== undefined) {
      const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
      updates.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(req.user.id);
    
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, username, email, phone, role`;
    
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    console.error('Error updating account:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Tags: List (Authenticated)
api.get('/tags', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM tags ORDER BY type, name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tags:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Tags: Create (Admin/Teacher only)
api.post('/tags', authenticateToken, authorize(['admin', 'teacher', 'technician']), async (req: any, res: Response) => {
  try {
    const { type, name, meta, is_default_for_student_view } = tagSchema.parse(req.body);
    
    const result = await pool.query(
      `INSERT INTO tags (type, name, meta, is_default_for_student_view, created_by) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [type, name, meta || {}, is_default_for_student_view || false, req.user.id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Tag with this type and name already exists' });
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    console.error('Error creating tag:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Tags: Update (Admin/Teacher only)
api.patch('/tags/:id', authenticateToken, authorize(['admin', 'teacher', 'technician']), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, meta, is_default_for_student_view } = req.body;
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    
    if (meta !== undefined) {
      updates.push(`meta = $${paramCount++}`);
      values.push(meta);
    }
    
    if (is_default_for_student_view !== undefined) {
      updates.push(`is_default_for_student_view = $${paramCount++}`);
      values.push(is_default_for_student_view);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `UPDATE tags SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating tag:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Tags: Delete (Admin only)
api.delete('/tags/:id', authenticateToken, authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query('DELETE FROM tags WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    res.json({ message: 'Tag deleted' });
  } catch (err) {
    console.error('Error deleting tag:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Note Tags: Assign tags to a note
api.post('/notes/:id/tags', authenticateToken, async (req: any, res: Response) => {
  try {
    const noteId = parseInt(req.params.id);
    const { tagIds } = req.body; // Array of tag IDs
    
    if (!Array.isArray(tagIds)) {
      return res.status(400).json({ error: 'tagIds must be an array' });
    }
    
    // Check if user can edit this note
    const noteResult = await pool.query('SELECT user_id FROM notes WHERE id = $1', [noteId]);
    if (noteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    const note = noteResult.rows[0];
    const canEdit = req.user.role === 'admin' || 
                    req.user.role === 'teacher' ||
                    isOwner(note.user_id, req.user.id);
    
    if (!canEdit) {
      return res.status(403).json({ error: 'Cannot edit this note' });
    }
    
    // Delete existing tags
    await pool.query('DELETE FROM note_tags WHERE note_id = $1', [noteId]);
    
    // Insert new tags
    if (tagIds.length > 0) {
      const values = tagIds.map((tagId, idx) => `($1, $${idx + 2})`).join(', ');
      const params = [noteId, ...tagIds];
      await pool.query(`INSERT INTO note_tags (note_id, tag_id) VALUES ${values}`, params);
    }
    
    res.json({ message: 'Tags updated' });
  } catch (err) {
    console.error('Error assigning tags:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Note Tags: Get tags for a note
api.get('/notes/:id/tags', authenticateToken, async (req: Request, res: Response) => {
  try {
    const noteId = parseInt(req.params.id);
    
    const result = await pool.query(
      `SELECT t.* FROM tags t
       JOIN note_tags nt ON t.id = nt.tag_id
       WHERE nt.note_id = $1
       ORDER BY t.type, t.name`,
      [noteId]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching note tags:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Reactions: Toggle reaction on a note
api.post('/notes/:id/reactions', authenticateToken, async (req: any, res: Response) => {
  try {
    const noteId = parseInt(req.params.id);
    const { reaction_type } = reactionSchema.parse(req.body);
    
    // Check if note exists
    const noteResult = await pool.query('SELECT id FROM notes WHERE id = $1', [noteId]);
    if (noteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Check if user already has a reaction
    const existingResult = await pool.query(
      'SELECT id, reaction_type FROM reactions WHERE user_id = $1 AND note_id = $2',
      [req.user.id, noteId]
    );
    
    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      
      // If same reaction, remove it
      if (existing.reaction_type === reaction_type) {
        await pool.query('DELETE FROM reactions WHERE id = $1', [existing.id]);
        return res.json({ message: 'Reaction removed', reaction: null });
      } else {
        // If different reaction, update it
        await pool.query(
          'UPDATE reactions SET reaction_type = $1, updated_at = NOW() WHERE id = $2',
          [reaction_type, existing.id]
        );
        return res.json({ message: 'Reaction updated', reaction: reaction_type });
      }
    } else {
      // No existing reaction, create new one
      await pool.query(
        'INSERT INTO reactions (user_id, note_id, reaction_type) VALUES ($1, $2, $3)',
        [req.user.id, noteId, reaction_type]
      );
      return res.json({ message: 'Reaction added', reaction: reaction_type });
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    console.error('Error toggling reaction:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Reactions: Get user's reaction for a note
api.get('/notes/:id/reactions/me', authenticateToken, async (req: any, res: Response) => {
  try {
    const noteId = parseInt(req.params.id);
    
    const result = await pool.query(
      'SELECT reaction_type FROM reactions WHERE user_id = $1 AND note_id = $2',
      [req.user.id, noteId]
    );
    
    if (result.rows.length === 0) {
      return res.json({ reaction: null });
    }
    
    res.json({ reaction: result.rows[0].reaction_type });
  } catch (err) {
    console.error('Error fetching user reaction:', err);
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

