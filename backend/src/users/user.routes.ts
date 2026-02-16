import { Router, Request, Response } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import pool from '../db/pool';
import { authenticateToken, authorize } from '../middleware/auth';
import { userCreateSchema, accountUpdateSchema } from '../common/schemas';

const router = Router();

// Create User (Admin, Technician)
router.post('/', authenticateToken, authorize(['admin', 'technician']), async (req: Request, res: Response) => {
  try {
    const { username, password, role, email } = userCreateSchema.parse(req.body);
    const hash = await argon2.hash(password, { type: argon2.argon2id });

    const result = await pool.query(
      'INSERT INTO users (username, password_hash, role, email) VALUES ($1, $2, $3, $4) RETURNING id, username, role, email, created_at',
      [username, hash, role, email || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already exists' });
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Internal error' });
  }
});

// List Users (Admin, Technician)
router.get('/', authenticateToken, authorize(['admin', 'technician']), async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, username, role, email, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// --- Account Routes ---
const accountRouter = Router();

// Get Current Account
accountRouter.get('/', authenticateToken, async (req: any, res: Response) => {
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

// Update Account
accountRouter.patch('/', authenticateToken, async (req: any, res: Response) => {
  try {
    const { email, phone, password } = accountUpdateSchema.parse(req.body);
    const updates: string[] = [];
    const values: any[] = [];
    let queryIdx = 1;

    if (email !== undefined) {
      updates.push(`email = $${queryIdx++}`);
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${queryIdx++}`);
      values.push(phone);
    }
    if (password !== undefined) {
      const hash = await argon2.hash(password, { type: argon2.argon2id });
      updates.push(`password_hash = $${queryIdx++}`);
      values.push(hash);
    }

    if (updates.length === 0) {
      return res.json({ message: 'No updates provided' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.user.id);
    
    // Correct query building
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${queryIdx} RETURNING id, username, email, phone, role`;
    
    const result = await pool.query(query, values);
    
    res.json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error('Update account error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

const userRouter = router;

export { userRouter, accountRouter };
