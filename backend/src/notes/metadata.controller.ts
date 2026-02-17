import { Request, Response } from 'express';
import { pool } from '../config/database';

export const listThemes = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM themes ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching themes:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const listCategories = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};
