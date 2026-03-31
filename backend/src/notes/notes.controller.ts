import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { AuditLogger } from '../common/audit';
import { NoteCreateSchema, NoteUpdateSchema } from './notes.schema';

export const listNotes = async (req: Request, res: Response) => {
  try {
    let query: string;
    let params: unknown[] = [];
    const role = req.user.role;
    const userId = req.user.id;

    if (role === 'admin' || role === 'technician') {
      // For Admin/Technician, we want ALL notes.
      query = `
        SELECT n.*, u.role AS owner_role, u.username as owner_username,
               t.id as theme_id, t.name as theme_name, t.color as theme_color,
               c.id as category_id, c.name as category_name,
               (
                 SELECT json_agg(json_build_object('id', tg.id, 'name', tg.name, 'type', tg.type, 'meta', tg.meta))
                 FROM note_tags nt 
                 JOIN tags tg ON nt.tag_id = tg.id 
                 WHERE nt.note_id = n.id
               ) as tags
        FROM notes n 
        JOIN users u ON n.user_id = u.id 
        LEFT JOIN note_themes nt ON n.id = nt.note_id
        LEFT JOIN themes t ON nt.theme_id = t.id
        LEFT JOIN note_categories nc ON n.id = nc.note_id
        LEFT JOIN categories c ON nc.category_id = c.id
        ORDER BY n.created_at DESC
      `;
    } else if (role === 'teacher') {
      // Teacher can see student notes (public or not? legacy said student role) + own notes
      query = `
        SELECT n.*, u.role AS owner_role, u.username as owner_username,
               t.id as theme_id, t.name as theme_name, t.color as theme_color,
               c.id as category_id, c.name as category_name,
               (
                 SELECT json_agg(json_build_object('id', tg.id, 'name', tg.name, 'type', tg.type, 'meta', tg.meta))
                 FROM note_tags nt 
                 JOIN tags tg ON nt.tag_id = tg.id 
                 WHERE nt.note_id = n.id
               ) as tags
        FROM notes n 
        JOIN users u ON n.user_id = u.id 
        LEFT JOIN note_themes nt ON n.id = nt.note_id
        LEFT JOIN themes t ON nt.theme_id = t.id
        LEFT JOIN note_categories nc ON n.id = nc.note_id
        LEFT JOIN categories c ON nc.category_id = c.id
        WHERE u.role = 'student' OR n.user_id = $1
        ORDER BY n.created_at DESC
      `;
      params = [userId];
    } else {
      // Student/Other can see OWN notes
      // (ignoring targeted notes for now to keep v0.3.0 parity, but structure is ready)
      query = `
        SELECT n.*, u.role AS owner_role, u.username as owner_username,
               t.id as theme_id, t.name as theme_name, t.color as theme_color,
               c.id as category_id, c.name as category_name,
               (
                 SELECT json_agg(json_build_object('id', tg.id, 'name', tg.name, 'type', tg.type, 'meta', tg.meta))
                 FROM note_tags nt 
                 JOIN tags tg ON nt.tag_id = tg.id 
                 WHERE nt.note_id = n.id
               ) as tags
        FROM notes n 
        JOIN users u ON n.user_id = u.id 
        LEFT JOIN note_themes nt ON n.id = nt.note_id
        LEFT JOIN themes t ON nt.theme_id = t.id
        LEFT JOIN note_categories nc ON n.id = nc.note_id
        LEFT JOIN categories c ON nc.category_id = c.id
        WHERE n.user_id = $1 
        ORDER BY n.created_at DESC
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);
    
    // Map results to cleaner object structure
    const notes = result.rows.map((r: unknown) => ({
      id: r.id,
      user_id: r.user_id,
      title: r.title,
      content: r.content,
      created_at: r.created_at,
      theme: r.theme_id ? { id: r.theme_id, name: r.theme_name, color: r.theme_color } : null,
      category: r.category_id ? { id: r.category_id, name: r.category_name } : null,
      tags: r.tags || [],
      owner_role: r.owner_role,
      owner_username: r.owner_username,
      reactions_up: r.reactions_up || 0,
      reactions_down: r.reactions_down || 0,
      view_count: r.view_count || 0,
      pinned: r.pinned || false,
      urgent: r.urgent || false
    }));

    res.json(notes);
  } catch (err) {
    console.error('Error listing notes:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const createNote = async (req: Request, res: Response) => {
  try {
    const { title, content, theme_id, category_id, tags, targets } = NoteCreateSchema.parse(req.body);
    const userId = req.user.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const noteRes = await client.query(
        'INSERT INTO notes (user_id, title, content) VALUES ($1, $2, $3) RETURNING id, title, content, created_at',
        [userId, title, content]
      );
      const note = noteRes.rows[0];

      if (theme_id) {
        await client.query('INSERT INTO note_themes (note_id, theme_id) VALUES ($1, $2)', [note.id, theme_id]);
      }

      if (category_id) {
        await client.query('INSERT INTO note_categories (note_id, category_id) VALUES ($1, $2)', [note.id, category_id]);
      }
      
      if (tags && tags.length > 0) {
        // Validate tags existence
        const tagRes = await client.query('SELECT id FROM tags WHERE id = ANY($1)', [tags]);
        if (tagRes.rowCount !== tags.length) {
            const foundIds = tagRes.rows.map((r: unknown) => (r as { id: number }).id);
            const missing = tags.filter((id: number) => !foundIds.includes(id));
            throw new z.ZodError([{ path: ['tags'], message: `Tags IDs introuvables: ${missing.join(', ')}`, code: "custom" }]);
        }

        for (const tagId of tags) {
          await client.query('INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2)', [note.id, tagId]);
        }
      }

      if (targets && targets.length > 0) {
        for (const target of targets) {
          // Strict validation for 'classe' target
          if (target.type === 'classe' && target.value) {
             const classRes = await client.query("SELECT 1 FROM tags WHERE type='classe' AND name=$1", [target.value]);
             if (classRes.rowCount === 0) {
                throw new z.ZodError([{ path: ['targets'], message: `Classe '${target.value}' introuvable`, code: "custom" }]);
             }
          }

          await client.query(
            'INSERT INTO note_targets (note_id, target_type, target_value) VALUES ($1, $2, $3)', 
             [note.id, target.type, target.value || null]
          );
        }
      }

      await client.query('COMMIT');

      // Audit Log
      AuditLogger.log({
        userId,
        action: 'NOTE_CREATED',
        entityType: 'note',
        entityId: note.id,
        details: { title, tags, targets },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({ ...note, theme_id, category_id, tags, targets });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error('Error creating note:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const deleteNote = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const noteRes = await pool.query('SELECT user_id FROM notes WHERE id = $1', [id]);
    if (noteRes.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const note = noteRes.rows[0];
    const isOwner = note.user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await pool.query('DELETE FROM notes WHERE id = $1', [id]);

    // Audit Log
    AuditLogger.log({
      userId: req.user.id,
      action: 'NOTE_DELETED',
      entityType: 'note',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const getNote = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const result = await pool.query(
      `SELECT n.*, u.username as owner_username, u.role as owner_role,
              t.id as theme_id, t.name as theme_name, t.color as theme_color,
              c.id as category_id, c.name as category_name
       FROM notes n 
       JOIN users u ON n.user_id = u.id 
       LEFT JOIN note_themes nt ON n.id = nt.note_id
       LEFT JOIN themes t ON nt.theme_id = t.id
       LEFT JOIN note_categories nc ON n.id = nc.note_id
       LEFT JOIN categories c ON nc.category_id = c.id
       WHERE n.id = $1`, 
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const role = req.user.role;
    const userId = req.user.id;
    const r = result.rows[0];

    // Access Control Logic
    const isOwner = r.user_id === userId;
    const isAdminOrTech = role === 'admin' || role === 'technician';
    const isTeacherOfStudent = role === 'teacher' && r.owner_role === 'student';

    if (!isOwner && !isAdminOrTech && !isTeacherOfStudent) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Format response
    const note = {
      id: r.id,
      user_id: r.user_id,
      title: r.title,
      content: r.content,
      created_at: r.created_at,
      theme: r.theme_id ? { id: r.theme_id, name: r.theme_name, color: r.theme_color } : null,
      category: r.category_id ? { id: r.category_id, name: r.category_name } : null,
      owner_role: r.owner_role,
      owner_username: r.owner_username,
      reactions_up: r.reactions_up || 0,
      reactions_down: r.reactions_down || 0,
      view_count: r.view_count || 0,
      pinned: r.pinned || false,
      urgent: r.urgent || false
    };

    res.json(note);
  } catch (err) {
    console.error('Error getting note:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const updateNote = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    // Validate ownership
    const noteRes = await pool.query('SELECT n.*, u.role as owner_role FROM notes n JOIN users u ON n.user_id = u.id WHERE n.id = $1', [id]);
    if (noteRes.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const note = noteRes.rows[0];
    const role = req.user.role;
    const userId = req.user.id;
    
    const isOwner = note.user_id === userId;
    const isAdmin = role === 'admin';
    const isTeacherOfStudent = role === 'teacher' && note.owner_role === 'student';
    
    if (!isOwner && !isAdmin && !isTeacherOfStudent) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { title, content, theme_id, category_id } = NoteUpdateSchema.parse(req.body);
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;
      
      if (title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        values.push(title);
      }
      if (content !== undefined) {
        updates.push(`content = $${paramIndex++}`);
        values.push(content);
      }
      
      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        
        const query = `UPDATE notes SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
        values.push(id);
        
        await client.query(query, values);
      }

      if (theme_id !== undefined) {
        await client.query('DELETE FROM note_themes WHERE note_id = $1', [id]);
        if (theme_id) { 
           await client.query('INSERT INTO note_themes (note_id, theme_id) VALUES ($1, $2)', [id, theme_id]);
        }
      }

      if (category_id !== undefined) {
        await client.query('DELETE FROM note_categories WHERE note_id = $1', [id]);
        if (category_id) {
           await client.query('INSERT INTO note_categories (note_id, category_id) VALUES ($1, $2)', [id, category_id]);
        }
      }

      await client.query('COMMIT');
      res.json({ message: 'Updated', id });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error('Error updating note:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

// --- Reactions ---

export const getUserReaction = async (req: Request, res: Response) => {
  try {
    const noteId = parseInt(req.params.id);
    if (isNaN(noteId)) return res.status(400).json({ error: 'Invalid Note ID' });

    const result = await pool.query(
      'SELECT reaction_type FROM reactions WHERE user_id = $1 AND note_id = $2',
      [req.user.id, noteId]
    );

    res.json({ reaction: result.rows.length > 0 ? result.rows[0].reaction_type : null });
  } catch (err) {
    console.error('Error fetching reaction:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const addReaction = async (req: Request, res: Response) => {
  try {
    const noteId = parseInt(req.params.id);
    if (isNaN(noteId)) return res.status(400).json({ error: 'Invalid Note ID' });

    const { reaction_type } = req.body; 
    if (!['up', 'down'].includes(reaction_type)) return res.status(400).json({ error: 'Invalid reaction type' });

    // Check existing reaction
    const existingRes = await pool.query(
      'SELECT reaction_type FROM reactions WHERE user_id = $1 AND note_id = $2',
      [req.user.id, noteId]
    );

    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
      if (existing.reaction_type === reaction_type) {
        // Toggle off (remove)
        await pool.query(
          'DELETE FROM reactions WHERE user_id = $1 AND note_id = $2',
          [req.user.id, noteId]
        );
        return res.json({ message: 'Reaction removed', toggled: true });
      }
    }

    // Upsert (Insert or Update if different type)
    await pool.query(
      `INSERT INTO reactions (user_id, note_id, reaction_type) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (user_id, note_id) DO UPDATE SET reaction_type = EXCLUDED.reaction_type, updated_at = NOW()`,
      [req.user.id, noteId, reaction_type]
    );

    res.json({ message: 'Reaction added' });
  } catch (err) {
    console.error('Error adding reaction:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const removeReaction = async (req: Request, res: Response) => {
  try {
    const noteId = parseInt(req.params.id);
    if (isNaN(noteId)) return res.status(400).json({ error: 'Invalid Note ID' });

    await pool.query(
      'DELETE FROM reactions WHERE user_id = $1 AND note_id = $2',
      [req.user.id, noteId]
    );

    res.json({ message: 'Reaction removed' });
  } catch (err) {
    console.error('Error removing reaction:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

// --- Comments ---

export const getComments = async (req: Request, res: Response) => {
  try {
    const noteId = parseInt(req.params.id);
    if (isNaN(noteId)) return res.status(400).json({ error: 'Invalid ID' });

    const result = await pool.query(
      `SELECT c.id, c.content, c.created_at, u.username 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.note_id = $1 
       ORDER BY c.created_at ASC`,
      [noteId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const addComment = async (req: Request, res: Response) => {
  try {
    const noteId = parseInt(req.params.id);
    if (isNaN(noteId)) return res.status(400).json({ error: 'Invalid ID' });
    const { content } = req.body;

    if (!content || content.trim() === '') return res.status(400).json({ error: 'Content required' });

    const result = await pool.query(
      'INSERT INTO comments (note_id, user_id, content) VALUES ($1, $2, $3) RETURNING id, content, created_at',
      [noteId, req.user.id, content]
    );
    
    // Return structured comment with username
    const comment = {
      ...result.rows[0],
      username: req.user.username
    };

    AuditLogger.log({
      userId: req.user.id,
      action: 'COMMENT_ADDED',
      entityType: 'comment',
      entityId: comment.id,
      details: { noteId },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json(comment);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
    // Left as exercise if needed (admins/owners)
    res.status(501).json({ error: 'Not implemented' });
};

