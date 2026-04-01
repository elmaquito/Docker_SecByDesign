import { Request, Response } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import { pool } from '../config/database';
import { AuditLogger } from '../common/audit';
import { userCreateSchema, accountUpdateSchema, profileUpdateSchema } from './user.schema';

export const createUser = async (req: Request, res: Response) => {
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
};

export const listUsers = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, username, role, created_at FROM users WHERE deleted_at IS NULL');
    res.json(result.rows);
  } catch (_err) {
    res.status(500).json({ error: 'Internal error' });
  }
};

export const getAccount = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
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
};

export const updateAccount = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Students cannot edit their account
    if (req.user.role === 'student') {
      return res.status(403).json({ error: 'Students cannot edit their account information' });
    }
    
    // accountUpdateSchema handles validation
    const { email, phone, password } = accountUpdateSchema.parse(req.body);
    
    // Build update query dynamically
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;
    
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    
    if (password !== undefined) {
      const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(passwordHash);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push(`updated_at = NOW()`);
    
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, email, phone, role`;
    values.push(req.user.id);
    
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    console.error('Error updating account:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const setupAdmin = async (req: Request, res: Response) => {
  try {
    const countRes = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(countRes.rows[0].count) > 0) {
      return res.status(403).json({ error: 'Setup already completed' });
    }

    const { username, password } = req.body; // userCreateSchema validation for admin role manual
    // Just enforce username and password presence
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const hash = await argon2.hash(password, { type: argon2.argon2id });
    await pool.query(
      "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'admin')",
      [username, hash]
    );
    res.json({ message: `Admin created (${username})` });
  } catch (err: any) {
    console.error('Setup error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};


export const exportData = async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);
  
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.user.id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const userRes = await pool.query('SELECT id, username, role, created_at FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userRes.rows[0];

    // Fetch Notes
    const notesRes = await pool.query('SELECT * FROM notes WHERE user_id = $1', [userId]);
    const notes = notesRes.rows;

    const exportData = {
      user,
      notes,
      exportedAt: new Date()
    };

    // Audit Log
    AuditLogger.log({
      userId: req.user.id,
      action: 'USER_EXPORTED',
      entityType: 'user',
      entityId: userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(exportData);
  } catch (err) {
    console.error('Error exporting data:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = parseInt(req.params.id);

  if (req.user.id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    await pool.query('UPDATE users SET deleted_at = NOW() WHERE id = $1', [userId]);

    AuditLogger.log({
      userId: req.user.id,
      action: 'USER_DELETED',
      entityType: 'user',
      entityId: userId,
      details: { requester: req.user.username },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ message: 'User account marked for deletion (Soft Delete)' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const listProfiles = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.username, u.role 
      FROM profiles p
      JOIN users u ON p.user_id = u.id
    `);
    res.json(result.rows);
  } catch (_err) {
    res.status(500).json({ error: 'Internal error' });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);

  try {
    const result = await pool.query(
      `SELECT p.*, u.username, u.role,
              COALESCE(
                 (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'type', t.type, 'meta', t.meta)) 
                  FROM user_tags ut 
                  JOIN tags t ON ut.tag_id = t.id 
                  WHERE ut.user_id = p.user_id),
                 '[]'::json
              ) as tags
       FROM profiles p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // If no profile exists, check if user exists
      const userRes = await pool.query('SELECT id, username, role FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      return res.json({ ...userRes.rows[0], profile: null, tags: [] });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = parseInt(req.params.id);

  // Security check: Only admin or the user themselves can edit
  if (req.user.role !== 'admin' && req.user.id !== userId) {
     return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { classe, promotion, niveau, tags } = profileUpdateSchema.parse(req.body);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update Profile
      await client.query(
        `INSERT INTO profiles (user_id, classe, promotion, niveau)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) 
         DO UPDATE SET 
           classe = EXCLUDED.classe,
           promotion = EXCLUDED.promotion,
           niveau = EXCLUDED.niveau,
           updated_at = NOW()`,
        [userId, classe, promotion, niveau]
      );

      // Update Tags if provided
      if (tags) {
        await client.query('DELETE FROM user_tags WHERE user_id = $1', [userId]);
        if (tags.length > 0) {
           // Insert new tags
           // Note: We could optimize with bulk insert, but loop is fine for MVP
           for (const tagId of tags) {
              await client.query('INSERT INTO user_tags (user_id, tag_id) VALUES ($1, $2)', [userId, tagId]);
           }
        }
      }

      await client.query('COMMIT');

      // Fetch updated profile to return
      // We can reuse getUserProfile logic or just redundant query here
      const result = await client.query(
        `SELECT p.*, u.username, u.role,
                COALESCE(
                   (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'type', t.type)) 
                    FROM user_tags ut 
                    JOIN tags t ON ut.tag_id = t.id 
                    WHERE ut.user_id = p.user_id),
                   '[]'::json
                ) as tags
         FROM profiles p
         JOIN users u ON p.user_id = u.id
         WHERE p.user_id = $1`,
        [userId]
      );
      
      res.json(result.rows[0]);

    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    if (err.code === '23503') return res.status(400).json({ error: 'Invalid tag ID' }); // FK violation
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

