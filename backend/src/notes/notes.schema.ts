import { z } from 'zod';

export const NoteCreateSchema = z.object({
  title: z.string().min(3).max(100),
  content: z.string().min(10), // Markdown
  theme_id: z.number().int().positive().optional(),
  category_id: z.number().int().positive().optional(),
  // For teachers creating notes for students
  target_role: z.enum(['student']).optional(),
  target_user_id: z.number().int().positive().optional(),
});

export const NoteUpdateSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  content: z.string().min(10).optional(),
  theme_id: z.number().int().positive().optional(),
  category_id: z.number().int().positive().optional(),
});

export const ReactionSchema = z.object({
  type: z.enum(['like', 'dislike', 'funny', 'insightful']),
});
