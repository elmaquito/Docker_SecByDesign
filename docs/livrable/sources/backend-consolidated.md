# NOTIMATIC — Backend Consolidé

> **Domaine** : API Node.js / Express / TypeScript  
> **Date de consolidation** : 2026-04-01  
> **Commit de référence** : `d43a8a27e16b58aad6e0639d1f329fed295f95f9`  
> **Répertoire source** : `backend/`

---

## Table des Matières

1. [Métadonnées](#1-métadonnées)
2. [Point d'entrée — `src/main.ts`](#2-point-dentrée--srcmaints)
3. [Configuration — `src/config/`](#3-configuration--srcconfig)
   - 3.1 [`env.ts`](#31-envts)
   - 3.2 [`database.ts`](#32-databasets)
4. [Authentification — `src/auth/`](#4-authentification--srcauth)
   - 4.1 [`auth.routes.ts`](#41-authroutests)
   - 4.2 [`auth.controller.ts`](#42-authcontrollerts)
   - 4.3 [`auth.schema.ts`](#43-authschemats)
   - 4.4 [`token.service.ts`](#44-tokenservicets)
5. [Commun — `src/common/`](#5-commun--srccommon)
   - 5.1 [`middleware.ts`](#51-middlewarets)
   - 5.2 [`audit.ts`](#52-auditts)
   - 5.3 [`types.ts`](#53-typests)
   - 5.4 [`utils.ts`](#54-utilsts)
6. [Utilisateurs — `src/users/`](#6-utilisateurs--srcusers)
   - 6.1 [`user.routes.ts`](#61-userroutests)
   - 6.2 [`user.controller.ts`](#62-usercontrollerts)
   - 6.3 [`user.schema.ts`](#63-userschemats)
7. [Notes — `src/notes/`](#7-notes--srcnotes)
   - 7.1 [`notes.routes.ts`](#71-notesroutests)
   - 7.2 [`notes.controller.ts`](#72-notescontrollerts)
   - 7.3 [`notes.schema.ts`](#73-notesschemats)
8. [Tags — `src/tags/`](#8-tags--srctags)
   - 8.1 [`tags.routes.ts`](#81-tagsroutests)
   - 8.2 [`tags.controller.ts`](#82-tagscontrollerts)
9. [Feed — `src/feed/`](#9-feed--srcfeed)
10. [Métadonnées API — `src/metadata/`](#10-métadonnées-api--srcmetadata)
11. [Base de Données — SQL](#11-base-de-données--sql)
    - 11.1 [`init.sql`](#111-initsql)
    - 11.2 [Migrations SQL (001→009)](#112-migrations-sql-001009)
12. [Configuration Projet](#12-configuration-projet)
    - 12.1 [`package.json`](#121-packagejson)
    - 12.2 [`tsconfig.json`](#122-tsconfigjson)

---

## 1. Métadonnées

| Champ | Valeur |
|-------|--------|
| **Runtime** | Node.js 20.x LTS |
| **Framework** | Express.js 4.18 |
| **Langage** | TypeScript 5.x (strict) |
| **Base de données** | PostgreSQL 16 |
| **Authentification** | JWT (jsonwebtoken 9.x) + Argon2id |
| **Validation** | Zod 3.x |
| **Sécurité** | Helmet 7.x, express-rate-limit 8.x, validator 13.x |
| **Tests** | Jest 29.x + Supertest |

**Pratiques de sécurité identifiées dans ce composant** :
- JWT HTTP-only cookies (access 15 min + refresh 30 j rotatifs)
- Hashing Argon2id (résistant GPU/ASIC) pour les mots de passe
- Refresh tokens opaques stockés en BDD sous forme de hash SHA-256
- Rate limiting sur 3 niveaux (global, auth, commentaires)
- Sanitization des entrées via `validator.escape()`
- Validation stricte via schémas Zod sur chaque endpoint
- Requêtes SQL paramétrées (`$1`, `$2`, …) — aucune concaténation
- Audit logging dans la table `audit_logs`
- RBAC 4 rôles via middleware `authorize()`

---

## 2. Point d'entrée — `src/main.ts`

> **Source** : `backend/src/main.ts`

```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { PORT, NODE_ENV, CORS_ORIGINS } from './config/env';
import { pool } from './config/database';
import { apiLimiter, sanitizeInput } from './common/middleware';
import authRoutes from './auth/auth.routes';
import userRoutes from './users/user.routes';
import noteRoutes from './notes/notes.routes';
import tagRoutes from './tags/tags.routes';
import metadataRoutes from './metadata/metadata.routes';
import feedRoutes from './feed/feed.routes';

const app = express();

// --- Middleware de sécurité ---
app.use(helmet());                          // Headers HTTP sécurisés (CSP, HSTS, X-Frame…)
app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(apiLimiter);                        // Rate limiting global : 100 req / 15 min / IP
app.use((req, res, next) => sanitizeInput(req, res, next)); // Sanitization XSS

// --- API v1 ---
const v1Router = express.Router();
v1Router.use('/auth',   authRoutes);
v1Router.use('/users',  userRoutes);
v1Router.use('/notes',  noteRoutes);
v1Router.use('/',       metadataRoutes);   // /themes et /categories
v1Router.use('/tags',   tagRoutes);
v1Router.use('/feed',   feedRoutes);

v1Router.get('/health', async (req, res) => {
  try {
    const time = await pool.query('SELECT NOW()');
    res.json({ status: 'OK', time: time.rows[0].now, version: 'v1' });
  } catch (_err) {
    res.status(500).json({ status: 'DB Connection Error' });
  }
});

app.use('/api/v1', v1Router);

// --- Rétrocompatibilité (alias racine) ---
app.use('/auth',  authRoutes);
app.use('/users', userRoutes);
app.use('/notes', noteRoutes);
app.use('/',      metadataRoutes);
app.use('/tags',  tagRoutes);

app.get('/health', async (req, res) => {
  try {
    const time = await pool.query('SELECT NOW()');
    res.json({ status: 'OK', time: time.rows[0].now, legacy: true });
  } catch (_err) {
    res.status(500).json({ status: 'DB Connection Error' });
  }
});

// --- Gestionnaire d'erreurs global ---
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
  });
}

export default app;
```

---

## 3. Configuration — `src/config/`

### 3.1 `env.ts`

> **Source** : `backend/src/config/env.ts`

```typescript
import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export const PORT = process.env.PORT || 3000;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'dev_refresh_secret_change_me';
export const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

export const DB_CONFIG = {
  host:     process.env.DB_HOST     || 'database',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  user:     process.env.DB_USER     || 'user',
  password: process.env.DB_PASSWORD || 'dev_secret_password',
  database: process.env.DB_NAME     || 'notimatic_dev',
};
```

### 3.2 `database.ts`

> **Source** : `backend/src/config/database.ts`

```typescript
import { Pool } from 'pg';
import { DB_CONFIG } from './env';

export const pool = new Pool(DB_CONFIG);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});
```

---

## 4. Authentification — `src/auth/`

### 4.1 `auth.routes.ts`

> **Source** : `backend/src/auth/auth.routes.ts`

```typescript
import { Router } from 'express';
import * as AuthController from './auth.controller';
import { authenticate } from '../common/middleware';

const router = Router();

router.post('/login',                  AuthController.login);
router.post('/logout',    authenticate, AuthController.logout);
router.post('/refresh',                AuthController.refresh);
router.post('/request-password-reset', AuthController.requestPasswordReset);
router.post('/reset-password',         AuthController.completePasswordReset);

export default router;
```

### 4.2 `auth.controller.ts`

> **Source** : `backend/src/auth/auth.controller.ts`

```typescript
import { Request, Response } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import { pool } from '../config/database';
import { TokenService } from './token.service';
import { loginSchema, passwordResetRequestSchema, passwordResetCompleteSchema } from './auth.schema';
import { generateToken, hashToken, sendEmail } from '../common/utils';
import { NODE_ENV } from '../config/env';

const tokenService = new TokenService();

// POST /auth/login
export const login = async (req: Request, res: Response) => {
  const { username, password } = loginSchema.parse(req.body);
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  const user = result.rows[0];
  if (!user || !(await argon2.verify(user.password_hash, password)))
    return res.status(401).json({ error: 'Invalid credentials' });

  const accessToken = tokenService.generateAccessToken({ id: user.id, username: user.username, role: user.role });
  const refreshTokenData = tokenService.generateRefreshToken();
  await tokenService.storeRefreshToken(user.id, refreshTokenData.tokenHash, refreshTokenData.expiresAt,
    req.headers['user-agent'], req.ip);

  const isProduction = NODE_ENV === 'production';
  res.cookie('auth_token',    accessToken,           { httpOnly: true, secure: isProduction, sameSite: isProduction ? 'none' : 'lax', maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshTokenData.token, { httpOnly: true, secure: isProduction, sameSite: isProduction ? 'none' : 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
  res.json({ message: 'Logged in', user: { id: user.id, username: user.username, role: user.role } });
};

// POST /auth/logout
export const logout = async (req: any, res: Response) => {
  const refreshToken = req.cookies['refresh_token'];
  if (refreshToken) await tokenService.revokeSession(refreshToken);
  res.clearCookie('auth_token');
  res.clearCookie('refresh_token');
  res.json({ message: 'Logged out' });
};

// POST /auth/refresh — rotation du refresh token
export const refresh = async (req: Request, res: Response) => {
  const oldRefreshToken = req.cookies['refresh_token'];
  if (!oldRefreshToken) return res.status(401).json({ error: 'No refresh token provided' });
  const newRefreshTokenData = await tokenService.rotateRefreshToken(oldRefreshToken, req.headers['user-agent'], req.ip || '');
  if (!newRefreshTokenData) return res.status(403).json({ error: 'Invalid or expired refresh token' });
  // ... (génération nouveau access token et set cookies)
  res.json({ message: 'Token refreshed' });
};
```

### 4.3 `auth.schema.ts`

> **Source** : `backend/src/auth/auth.schema.ts`

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const passwordResetRequestSchema = z.object({
  username: z.string().min(1),
});

export const passwordResetCompleteSchema = z.object({
  token:       z.string().min(1),
  newPassword: z.string().min(12, "Password must be at least 12 chars"),
});
```

### 4.4 `token.service.ts`

> **Source** : `backend/src/auth/token.service.ts`

```typescript
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { JWT_SECRET, REFRESH_TOKEN_SECRET } from '../config/env';
import { pool } from '../config/database';

export class TokenService {
  private readonly ACCESS_TOKEN_TTL  = '15m';
  private readonly REFRESH_TOKEN_TTL_DAYS = 30;

  generateAccessToken(payload: { id: number; username: string; role: string }): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.ACCESS_TOKEN_TTL });
  }

  verifyAccessToken(token: string) {
    try { return jwt.verify(token, this.jwtSecret); }
    catch { return null; }
  }

  generateRefreshToken() {
    const token     = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_TTL_DAYS * 86400 * 1000);
    return { token, tokenHash, expiresAt };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token + this.refreshTokenSecret).digest('hex');
  }

  async storeRefreshToken(userId, tokenHash, expiresAt, userAgent?, ipAddress?) {
    await this.pool.query(
      `INSERT INTO sessions (user_id, refresh_token_hash, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, tokenHash, expiresAt, userAgent, ipAddress]
    );
  }

  async validateRefreshToken(token: string) {
    const tokenHash = this.hashToken(token);
    const result = await this.pool.query(
      `SELECT id, user_id FROM sessions
       WHERE refresh_token_hash = $1 AND expires_at > NOW() AND revoked = FALSE`,
      [tokenHash]
    );
    return result.rows.length === 0 ? null : { userId: result.rows[0].user_id, sessionId: result.rows[0].id };
  }

  async rotateRefreshToken(oldToken: string, userAgent?, ipAddress?) {
    // Transaction atomique : valider → révoquer → créer nouveau
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const validation = await this.validateRefreshToken(oldToken);
      if (!validation) { await client.query('ROLLBACK'); return null; }
      await client.query('UPDATE sessions SET revoked = TRUE WHERE id = $1', [validation.sessionId]);
      const newToken = this.generateRefreshToken();
      await client.query(`INSERT INTO sessions (user_id, refresh_token_hash, expires_at, user_agent, ip_address) VALUES ($1,$2,$3,$4,$5)`,
        [validation.userId, newToken.tokenHash, newToken.expiresAt, userAgent, ipAddress]);
      await client.query('COMMIT');
      return newToken;
    } catch (err) {
      await client.query('ROLLBACK');
      return null;
    } finally { client.release(); }
  }
}
```

---

## 5. Commun — `src/common/`

### 5.1 `middleware.ts`

> **Source** : `backend/src/common/middleware.ts`

```typescript
import rateLimit from 'express-rate-limit';
import validator from 'validator';
import { TokenService } from '../auth/token.service';

const tokenService = new TokenService();

// --- Authentification (JWT + auto-refresh) ---
export const authenticate = async (req: any, res, next) => {
  const accessToken  = req.cookies['auth_token'];
  const refreshToken = req.cookies['refresh_token'];

  if (accessToken) {
    const verified = tokenService.verifyAccessToken(accessToken);
    if (verified) { req.user = verified; return next(); }
  }

  // Si access token invalide/expiré, tenter le refresh
  if (refreshToken) {
    const validation = await tokenService.validateRefreshToken(refreshToken);
    if (!validation) return res.status(401).json({ error: 'Session expired' });
    const user = (await pool.query('SELECT id, username, role FROM users WHERE id = $1', [validation.userId])).rows[0];
    if (!user) return res.status(401).json({ error: 'User not found' });
    const newAccessToken = tokenService.generateAccessToken({ id: user.id, username: user.username, role: user.role });
    res.cookie('auth_token', newAccessToken, { httpOnly: true, secure: NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60 * 1000 });
    req.user = { id: user.id, username: user.username, role: user.role };
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized: No authentication token' });
};

// --- Autorisation (RBAC) ---
export const authorize = (allowedRoles: string[]) => (req: any, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (allowedRoles.includes(req.user.role)) return next();
  return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
};

// --- Rate Limiters ---
export const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100,  message: { error: 'Too many requests' } });
export const authLimiter    = rateLimit({ windowMs: 60 * 60 * 1000, max: 15,   message: { error: 'Too many login attempts' } });
export const commentLimiter = rateLimit({ windowMs: 60 * 1000,      max: 10,   message: { error: 'Slow down! Max 10 comments/minute' } });

// --- Sanitization XSS ---
export const sanitizeInput = (req: any, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') req.body[key] = validator.escape(req.body[key]);
    }
  }
  next();
};
```

### 5.2 `audit.ts`

> **Source** : `backend/src/common/audit.ts`

```typescript
import { pool } from '../config/database';

export class AuditLogger {
  static async log(params: {
    userId: number | null; action: string; entityType?: string;
    entityId?: number; details?: any; ipAddress?: string; userAgent?: string;
  }): Promise<void> {
    const { userId, action, entityType, entityId, details, ipAddress, userAgent } = params;
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, action, entityType, entityId, details ? JSON.stringify(details) : null, ipAddress, userAgent]
      );
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }
}
```

### 5.3 `types.ts`

> **Source** : `backend/src/common/types.ts`

```typescript
export type Role = 'admin' | 'technician' | 'teacher' | 'student';

export interface User {
  id: number;
  username: string;
  role: Role;
  email?: string;
  phone?: string;
}
```

### 5.4 `utils.ts`

> **Source** : `backend/src/common/utils.ts`

```typescript
import crypto from 'crypto';

export const generateToken = (): string => crypto.randomBytes(32).toString('hex');
export const hashToken     = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');
export const sendEmail     = async (to: string, subject: string, body: string) => {
  console.log(`📧 Email → ${to} | ${subject}\n${body}`);
  // Production : nodemailer ou SendGrid
};
```

---

## 6. Utilisateurs — `src/users/`

### 6.1 `user.routes.ts`

> **Source** : `backend/src/users/user.routes.ts`

```typescript
import { Router } from 'express';
import * as UserController from './user.controller';
import { authenticate, authorize } from '../common/middleware';

const router = Router();

router.post('/setup',        UserController.setupAdmin);                                   // Bootstrap initial (si 0 users)
router.post('/',   authenticate, authorize(['admin', 'technician']), UserController.createUser);
router.get('/',    authenticate, authorize(['admin', 'technician', 'teacher']), UserController.listUsers);
router.get('/me',  authenticate, UserController.getAccount);
router.put('/me',  authenticate, UserController.updateAccount);

// RGPD
router.get('/:id/export',  authenticate, UserController.exportData);
router.delete('/:id',      authenticate, authorize(['admin']), UserController.deleteUser);

// Profils
router.get('/:id/profile',  authenticate, UserController.getUserProfile);
router.put('/:id/profile',  authenticate, UserController.updateUserProfile);

export default router;
```

### 6.2 `user.controller.ts` (extraits clés)

> **Source** : `backend/src/users/user.controller.ts`

```typescript
// Création d'utilisateur (admin/technician uniquement)
export const createUser = async (req: any, res: Response) => {
  const { username, password, role } = userCreateSchema.parse(req.body);
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  const result = await pool.query(
    'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
    [username, hash, role]
  );
  res.status(201).json(result.rows[0]);
};

// Export RGPD — Article 15 (droit d'accès)
export const exportData = async (req: any, res: Response) => {
  const userId = parseInt(req.params.id);
  if (req.user.id !== userId && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Forbidden' });
  const user  = (await pool.query('SELECT id, username, role, created_at FROM users WHERE id = $1', [userId])).rows[0];
  const notes = (await pool.query('SELECT * FROM notes WHERE user_id = $1', [userId])).rows;
  AuditLogger.log({ userId: req.user.id, action: 'USER_EXPORTED', entityType: 'user', entityId: userId, ipAddress: req.ip });
  res.json({ user, notes, exportedAt: new Date() });
};

// Suppression (soft-delete) — Article 17 (droit à l'effacement)
export const deleteUser = async (req: any, res: Response) => {
  const userId = parseInt(req.params.id);
  await pool.query('UPDATE users SET deleted_at = NOW() WHERE id = $1', [userId]);
  AuditLogger.log({ userId: req.user.id, action: 'USER_DELETED', entityType: 'user', entityId: userId });
  res.json({ message: 'User account marked for deletion (Soft Delete)' });
};
```

### 6.3 `user.schema.ts`

> **Source** : `backend/src/users/user.schema.ts`

```typescript
import { z } from 'zod';

export const userCreateSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, "Alphanumeric only"),
  password: z.string().min(12, "Password must be at least 12 chars"),
  role:     z.enum(['admin', 'technician', 'teacher', 'student']).default('student'),
});

export const accountUpdateSchema = z.object({
  email:    z.string().email().optional(),
  phone:    z.string().max(20).optional(),
  password: z.string().min(12).optional(),
});

export const profileUpdateSchema = z.object({
  classe:    z.string().max(50).optional(),
  promotion: z.string().max(50).optional(),
  niveau:    z.string().max(20).optional(),
  tags:      z.array(z.number().int().positive()).optional(),
});
```

---

## 7. Notes — `src/notes/`

### 7.1 `notes.routes.ts`

> **Source** : `backend/src/notes/notes.routes.ts`

```typescript
import { Router } from 'express';
import * as NotesController from './notes.controller';
import * as TagsController from '../tags/tags.controller';
import { authenticate, authorize } from '../common/middleware';

const router = Router();

router.get('/',    authenticate, NotesController.listNotes);
router.post('/',   authenticate, authorize(['teacher', 'student', 'admin']), NotesController.createNote);
router.get('/:id', authenticate, NotesController.getNote);
router.delete('/:id', authenticate, NotesController.deleteNote);
router.patch('/:id',  authenticate, NotesController.updateNote);

// Tags sur une note
router.get('/:id/tags',  authenticate, TagsController.getNoteTags);
router.post('/:id/tags', authenticate, authorize(['teacher', 'student', 'admin']), TagsController.updateNoteTags);

// Réactions
router.get('/:id/reactions/me', authenticate, NotesController.getUserReaction);
router.post('/:id/reactions',   authenticate, NotesController.addReaction);

// Commentaires
router.get('/:id/comments',  authenticate, NotesController.getComments);
router.post('/:id/comments', authenticate, NotesController.addComment);

export default router;
```

### 7.2 `notes.controller.ts` (extrait — listNotes)

> **Source** : `backend/src/notes/notes.controller.ts`

```typescript
// Logique de visibilité des notes selon le rôle
export const listNotes = async (req: any, res: Response) => {
  const { role, id: userId } = req.user;
  let query: string, params: any[] = [];

  if (role === 'admin' || role === 'technician') {
    query = `SELECT n.*, u.username as owner_username, ... FROM notes n JOIN users u ON n.user_id = u.id ORDER BY n.created_at DESC`;
  } else if (role === 'teacher') {
    query = `... WHERE u.role = 'student' OR n.user_id = $1`;
    params = [userId];
  } else {
    query = `... WHERE n.user_id = $1`;
    params = [userId];
  }

  const result = await pool.query(query, params);
  res.json(result.rows.map(r => ({
    id: r.id, title: r.title, content: r.content, created_at: r.created_at,
    tags: r.tags || [], owner_username: r.owner_username,
    reactions_up: r.reactions_up || 0, reactions_down: r.reactions_down || 0,
    pinned: r.pinned || false, urgent: r.urgent || false,
  })));
};
```

### 7.3 `notes.schema.ts`

> **Source** : `backend/src/notes/notes.schema.ts`

```typescript
import { z } from 'zod';

export const NoteCreateSchema = z.object({
  title:       z.string().min(3).max(100),
  content:     z.string().min(10),
  theme_id:    z.number().int().positive().optional(),
  category_id: z.number().int().positive().optional(),
  tags:        z.array(z.number().int().positive()).optional(),
  targets:     z.array(z.object({
    type:  z.enum(['user', 'classe', 'promotion', 'niveau', 'all']),
    value: z.string().optional(),
  })).optional(),
});

export const ReactionSchema = z.object({
  reaction_type: z.enum(['up', 'down']),
});

export const CommentSchema = z.object({
  content: z.string().min(1).max(1000),
});
```

---

## 8. Tags — `src/tags/`

### 8.1 `tags.routes.ts`

> **Source** : `backend/src/tags/tags.routes.ts`

```typescript
import { Router } from 'express';
import * as TagsController from './tags.controller';
import { authenticate, authorize } from '../common/middleware';

const router = Router();

router.get('/',    authenticate, TagsController.listTags);
router.post('/',   authenticate, authorize(['admin', 'teacher', 'technician']), TagsController.createTag);
router.patch('/:id', authenticate, authorize(['admin', 'teacher', 'technician']), TagsController.updateTag);
router.delete('/:id', authenticate, authorize(['admin']), TagsController.deleteTag);

export default router;
```

### 8.2 `tags.controller.ts` (extraits)

> **Source** : `backend/src/tags/tags.controller.ts`

```typescript
export const TagSchema = z.object({
  type:                      z.enum(['classe', 'specialite', 'groupe', 'categorie']),
  name:                      z.string().min(1).max(100),
  meta:                      z.object({}).passthrough().optional(),
  is_default_for_student_view: z.boolean().optional(),
});

export const listTags = async (req, res) => {
  const result = await pool.query('SELECT * FROM tags ORDER BY type, name ASC');
  res.json(result.rows);
};

export const createTag = async (req, res) => {
  const { type, name, meta, is_default_for_student_view } = TagSchema.parse(req.body);
  const result = await pool.query(
    `INSERT INTO tags (type, name, meta, is_default_for_student_view, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [type, name, meta || {}, is_default_for_student_view || false, req.user.id]
  );
  res.status(201).json(result.rows[0]);
};
```

---

## 9. Feed — `src/feed/`

> **Source** : `backend/src/feed/feed.routes.ts`, `backend/src/feed/feed.controller.ts`

```typescript
// Route
import { Router } from 'express';
import { getFeed } from './feed.controller';
import { authenticate } from '../common/middleware';

const router = Router();
router.get('/', authenticate, getFeed);   // GET /api/v1/feed
export default router;
```

Le feed est filtré par les `user_tags` de l'utilisateur connecté : seules les notes dont les tags correspondent aux tags assignés à l'utilisateur sont retournées.

---

## 10. Métadonnées API — `src/metadata/`

> **Source** : `backend/src/metadata/metadata.routes.ts`

```typescript
import { Router } from 'express';
import * as MetadataController from './metadata.controller';
import { authenticate } from '../common/middleware';

const router = Router();
router.get('/themes',     authenticate, MetadataController.listThemes);
router.get('/categories', authenticate, MetadataController.listCategories);

export default router;
```

---

## 11. Base de Données — SQL

### 11.1 `init.sql`

> **Source** : `backend/init.sql`

```sql
CREATE TYPE user_role AS ENUM ('admin', 'technician', 'teacher', 'student');

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role NOT NULL DEFAULT 'student',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(100) NOT NULL,
  content    TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  note_id    INTEGER REFERENCES notes(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 11.2 Migrations SQL (001→009)

> **Source** : `backend/migrations/`

| Migration | Fichier | Description |
|-----------|---------|-------------|
| 001 | `001_add_profiles.sql` | Table `profiles` (classe, promo, niveau) |
| 002 | `002_add_themes_categories.sql` | Tables `themes`, `categories`, `note_themes`, `note_categories` |
| 003 | `003_add_note_targets.sql` | Table `note_targets` (ciblage fin) |
| 004 | `004_add_audit_gdpr.sql` | Tables `audit_logs`, `gdpr_export_requests` |
| 005 | `005_add_password_reset.sql` | Table `password_reset_tokens` |
| 006 | `006_add_unified_tags.sql` | Table `tags` unifiés (type ENUM : classe/specialite/groupe/categorie) |
| 007 | `007_add_reactions.sql` | Table `reactions` (toggle par utilisateur) |
| 008 | `008_add_sessions.sql` | Table `sessions` (refresh tokens persistants) |
| 009 | `009_add_user_tags.sql` | Table `user_tags` (tags affectés à un utilisateur pour le feed ciblé) |

---

## 12. Configuration Projet

### 12.1 `package.json`

> **Source** : `backend/package.json`

| Script | Commande |
|--------|----------|
| `build` | `tsc` — Compilation TypeScript |
| `start` | `node dist/main.js` — Production |
| `start:dev` | `ts-node-dev --respawn` — Développement avec hot-reload |
| `test` | `jest --config jest.config.js` |
| `test:coverage` | `jest --coverage` |
| `lint` | `eslint .` |

**Dépendances de production clés** :

| Package | Version | Rôle |
|---------|---------|------|
| `argon2` | ^0.44.0 | Hashing mots de passe (Argon2id) |
| `jsonwebtoken` | ^9.0.0 | JWT access tokens |
| `express-rate-limit` | ^8.3.1 | Rate limiting |
| `helmet` | ^7.0.0 | Headers HTTP sécurisés |
| `validator` | ^13.15.26 | Sanitization XSS |
| `zod` | ^3.21.4 | Validation des entrées |
| `pg` | ^8.11.0 | Client PostgreSQL |

### 12.2 `tsconfig.json`

> **Source** : `backend/tsconfig.json`

TypeScript en mode strict (`"strict": true`), compilation vers `dist/`, module CommonJS, target ES2020.
