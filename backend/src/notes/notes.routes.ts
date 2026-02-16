import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db/pool';
import { authenticateToken, authorize } from '../middleware/auth';
import { noteSchema } from '../common/schemas';

const router = Router();

// Helper: Check Ownership
const isOwner = (resourceUserId: number, currentUserId: number) => {
  return resourceUserId === currentUserId;
};

// List Notes
router.get('/', authenticateToken, async (req: any, res: Response) => {
  try {
    let query: string;
    let params: any[] = [];

    if (req.user.role === 'admin' || req.user.role === 'technician') {
      // Admins see all
      query = `SELECT n.*, u.role AS owner_role, u.username as owner_username
               FROM notes n 
               JOIN users u ON n.user_id = u.id 
               ORDER BY n.created_at DESC`;
    } else if (req.user.role === 'teacher') {
      // Teachers see student notes + their own? Original logic: "Teachers can view notes belonging to students"
      // Original query: WHERE u.role = 'student'
      // This implicitly excludes their own notes if they create any? That would be odd.
      // Assuming they want to see student notes.
      query = `SELECT n.*, u.role AS owner_role, u.username as owner_username
               FROM notes n 
               JOIN users u ON n.user_id = u.id 
               WHERE u.role = 'student' OR n.user_id = $1
               ORDER BY n.created_at DESC`;
      params = [req.user.id];
    } else {
      // Students see only their own
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
    console.error('List notes error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Create Note
router.post('/', authenticateToken, authorize(['teacher', 'student', 'admin']), async (req: any, res: Response) => {
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

// Get Note
router.get('/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query(
      'SELECT n.*, u.role AS owner_role, u.username as owner_username FROM notes n JOIN users u ON n.user_id = u.id WHERE n.id = $1', 
      [id]
    );
    const note = result.rows[0];

    if (!note) return res.status(404).json({ error: 'Not found' });

    const isAllowed =
      req.user.role === 'admin' ||
      req.user.role === 'technician' ||
      isOwner(note.user_id, req.user.id) ||
      (req.user.role === 'teacher' && note.owner_role === 'student');

    if (!isAllowed) return res.status(403).json({ error: 'Forbidden' });

    res.json(note);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Update Note
router.patch('/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { title, content } = req.body;
    const result = await pool.query('SELECT n.*, u.role AS owner_role FROM notes n JOIN users u ON n.user_id = u.id WHERE n.id = $1', [id]);
    const note = result.rows[0];

    if (!note) return res.status(404).json({ error: 'Not found' });

    const canEdit =
      req.user.role === 'admin' ||
      isOwner(note.user_id, req.user.id) ||
      (req.user.role === 'teacher' && note.owner_role === 'student'); // Teachers can edit student notes? Yes per old logic.

    if (!canEdit) return res.status(403).json({ error: 'Forbidden' });

    const upd = await pool.query(
      'UPDATE notes SET title = COALESCE($1, title), content = COALESCE($2, content) WHERE id = $3 RETURNING *', 
      [title, content, id]
    );
    res.json(upd.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Delete Note
router.delete('/:id', authenticateToken, async (req: any, res: Response) => {
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

// Comments: List
router.get('/:id/comments', authenticateToken, async (req: any, res: Response) => {
  try {
    const noteId = parseInt(req.params.id);
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

// Comments: Create
router.post('/:id/comments', authenticateToken, async (req: any, res: Response) => {
  try {
    const noteId = parseInt(req.params.id);
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Content required" });

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

export const noteRouter = router;
