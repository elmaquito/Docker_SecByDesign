import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

type AuthMiddleware = (req: Request, res: Response, next: NextFunction) => void;
type AuthorizeMiddleware = (roles: string[]) => (req: Request, res: Response, next: NextFunction) => void;

export const createThemeRouter = (
  pool: Pool,
  authenticate: AuthMiddleware,
  authorize: AuthorizeMiddleware
) => {
  const router = Router();

  router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM themes ORDER BY name ASC');
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching themes:', err);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  router.post('/', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
    try {
      const { name, description, color } = req.body;
      const result = await pool.query(
        'INSERT INTO themes (name, description, color, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, description, color, (req as Request & { user: { id: number } }).user.id]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creating theme:', err);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  router.put('/:id', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
    try {
      const { name, description, color } = req.body;
      const result = await pool.query(
        'UPDATE themes SET name = $1, description = $2, color = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
        [name, description, color, req.params.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Theme not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error updating theme:', err);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  router.delete('/:id', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
    try {
      const result = await pool.query('DELETE FROM themes WHERE id = $1', [req.params.id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Theme not found' });
      }
      res.json({ message: 'Theme deleted' });
    } catch (err) {
      console.error('Error deleting theme:', err);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  return router;
};
