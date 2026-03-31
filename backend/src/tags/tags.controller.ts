import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';

export const TagSchema = z.object({
  type: z.enum(['classe', 'specialite', 'groupe', 'categorie']),
  name: z.string().min(1).max(100),
  meta: z.object({}).passthrough().optional(),
  is_default_for_student_view: z.boolean().optional(),
});

export const listTags = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM tags ORDER BY type, name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tags:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const createTag = async (req: Request, res: Response) => {
  try {
    const { type, name, meta, is_default_for_student_view } = TagSchema.parse(req.body);

    const result = await pool.query(
      `INSERT INTO tags (type, name, meta, is_default_for_student_view, created_by) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [type, name, meta || {}, is_default_for_student_view || false, (req as Request & { user: { id: number } }).user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    if (err.code === '23505') return res.status(409).json({ error: 'Tag already exists' });
    console.error('Error creating tag:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const updateTag = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updates = [];
    const values = [];
    let paramCount = 1;

    // Partial update logic
    if (req.body.name) {
      updates.push(`name = $${paramCount++}`);
      values.push(req.body.name);
    }
    // ... other fields if needed ...
    
    if (updates.length > 0) {
       updates.push(`updated_at = NOW()`);
       const query = `UPDATE tags SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
       values.push(id);
       const result = await pool.query(query, values);
       if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
       res.json(result.rows[0]);
    } else {
       res.json({ message: 'No changes' });
    }
  } catch (err) {
    console.error('Error updating tag:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const deleteTag = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query('DELETE FROM tags WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Error deleting tag:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const getNoteTags = async (req: Request, res: Response) => {
  try {
    const noteId = parseInt(req.params.id);
    const result = await pool.query(
      `SELECT t.* FROM tags t 
       JOIN note_tags nt ON t.id = nt.tag_id 
       WHERE nt.note_id = $1`, 
      [noteId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching note tags:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const updateNoteTags = async (req: Request, res: Response) => {
  try {
    const noteId = parseInt(req.params.id);
    const { tagIds } = req.body; // Array of IDs
    if (!Array.isArray(tagIds)) return res.status(400).json({ error: 'tagIds must be an array' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM note_tags WHERE note_id = $1', [noteId]);
      
      if (tagIds.length > 0) {
        // Bulk insert
        const values = tagIds.map((tid, idx) => `($1, $${idx + 2})`).join(', ');
        const params = [noteId, ...tagIds];
        await client.query(`INSERT INTO note_tags (note_id, tag_id) VALUES ${values}`, params);
      }
      
      await client.query('COMMIT');
      res.json({ message: 'Tags updated' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error updating note tags:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};
