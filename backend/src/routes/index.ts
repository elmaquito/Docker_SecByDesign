import { Router } from 'express';
import { authRouter } from '../auth/auth.routes';
import { userRouter, accountRouter } from '../users/user.routes';
import { noteRouter } from '../notes/notes.routes';
import { createProfileRouter } from '../profiles/profile.routes';
import { createThemeRouter } from '../themes/theme.routes';
import { createCategoryRouter } from '../categories/category.routes';
import pool from '../db/pool';
import { authenticateToken, authorize } from '../middleware/auth';
import { userCreateSchema } from '../common/schemas';
import argon2 from 'argon2';
import { z } from 'zod';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', db: 'connected' });
});

// Mount Routes
router.use('/auth', authRouter);
router.use('/users', userRouter); 
router.use('/account', accountRouter); // Matches original API structure /api/v1/account

router.use('/notes', noteRouter);

// Feature Modules (Legacy Factory Pattern)
router.use('/profiles', createProfileRouter(pool, authenticateToken));
router.use('/themes', createThemeRouter(pool, authenticateToken, authorize));
router.use('/categories', createCategoryRouter(pool, authenticateToken, authorize));

// System Setup (One-off)
router.post('/setup', async (req, res) => {
  try {
    const countRes = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(countRes.rows[0].count) > 0) {
      return res.status(403).json({ error: 'Setup already completed' });
    }

    // Force role to admin
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

export const apiRouter = router;
