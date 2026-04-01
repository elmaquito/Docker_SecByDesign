import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

import { NextFunction } from 'express';
type AuthMiddleware = (req: Request, res: Response, next: NextFunction) => void;
type AuthorizeMiddleware = (roles: string[]) => (req: Request, res: Response, next: NextFunction) => void;

export const createCategoryRouter = (
  pool: Pool,
  authenticate: AuthMiddleware,
  authorize: AuthorizeMiddleware
) => {
  const router = Router();

  router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM categories ORDER BY name ASC');
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching categories:', err);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  router.post('/', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
    try {
      const { name, target_type, target_value } = req.body;
      const result = await pool.query(
        'INSERT INTO categories (name, target_type, target_value) VALUES ($1, $2, $3) RETURNING *',
        [name, target_type, target_value]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creating category:', err);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  router.put('/:id', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
    try {
      const { name, target_type, target_value } = req.body;
      const result = await pool.query(
        'UPDATE categories SET name = $1, target_type = $2, target_value = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
        [name, target_type, target_value, req.params.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error updating category:', err);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  router.delete('/:id', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
    try {
      const result = await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }
      res.json({ message: 'Category deleted' });
    } catch (err) {
      console.error('Error deleting category:', err);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  return router;
};
