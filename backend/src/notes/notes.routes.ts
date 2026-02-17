import { Router } from 'express';
import * as NotesController from './notes.controller';
import * as TagsController from '../tags/tags.controller';
import { authenticate } from '../common/middleware';
import { authorize } from '../common/middleware';

const router = Router();

// List notes
router.get('/', authenticate, NotesController.listNotes);

// Create note
router.post('/', authenticate, authorize(['teacher', 'student', 'admin']), NotesController.createNote);

// Get single note
router.get('/:id', authenticate, NotesController.getNote);

// Delete note
router.delete('/:id', authenticate, NotesController.deleteNote);

// Update note
router.patch('/:id', authenticate, NotesController.updateNote);

// Tags on Notes
router.get('/:id/tags', authenticate, TagsController.getNoteTags);
router.post('/:id/tags', authenticate, authorize(['teacher', 'student', 'admin']), TagsController.updateNoteTags);

export default router;
