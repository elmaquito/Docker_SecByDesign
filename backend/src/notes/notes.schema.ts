import { z } from 'zod';

export const NoteCreateSchema = z.object({
  title: z.string().min(3).max(100),
  content: z.string().min(10), // Markdown
  tags: z.array(z.number().int().positive()).optional(),
  targets: z.array(z.object({
    type: z.enum(['user', 'classe', 'promotion', 'niveau', 'all']),
    value: z.string().optional()
  })).optional(),
});

export const NoteUpdateSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  content: z.string().min(10).optional(),
  tags: z.array(z.number().int().positive()).optional(),
  targets: z.array(z.object({
    type: z.enum(['user', 'classe', 'promotion', 'niveau', 'all']),
    value: z.string().optional()
  })).optional(),
});

export const ReactionSchema = z.object({
  reaction_type: z.enum(['up', 'down']),
});

export const CommentSchema = z.object({
  content: z.string().min(1).max(1000),
});
