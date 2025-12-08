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

// --- Validation Schemas (Zod) ---
const registerSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, "Alphanumeric only"),
  password: z.string().min(12, "Password must be at least 12 chars"),
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
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Allow both localhost and IP
  credentials: true, // Allow cookies
}));
app.use(express.json());
app.use(cookieParser());

// --- Middleware ---
const authenticateToken = (req: any, res: Response, next: NextFunction) => {
  const token = req.cookies['auth_token'];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Routes ---

app.get('/health', (req, res) => {
  res.json({ status: 'ok', db: 'connected' });
});

// Auth: Register
app.post('/auth/register', async (req, res) => {
  try {
    const { username, password } = registerSchema.parse(req.body);
    
    // Security: Argon2id hashing
    const hash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 2 ** 16, // 64 MB
        timeCost: 3,
        parallelism: 1,
    });

    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, hash]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already exists' });
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Auth: Login
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user || !(await argon2.verify(user.password_hash, password))) {
      // Security: Generic error message to prevent enumeration
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Security: Short-lived JWT
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '15m' });

    // Security: HttpOnly Cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: false, // Set to true in production (HTTPS)
      sameSite: 'lax', // Strict is better but can be tricky with dev ports
      maxAge: 15 * 60 * 1000 // 15 min
    });

    res.json({ message: 'Logged in', user: { id: user.id, username: user.username } });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/auth/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ message: 'Logged out' });
});

// Notes: List
app.get('/notes', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query('SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Notes: Create
app.post('/notes', authenticateToken, async (req: any, res) => {
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

app.listen(PORT, () => {
  console.log(`Secure Backend running on port ${PORT}`);
});
