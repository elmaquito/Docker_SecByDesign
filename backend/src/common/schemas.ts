import { z } from 'zod';

export const userCreateSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, "Alphanumeric only"),
  password: z.string().min(12, "Password must be at least 12 chars"),
  role: z.enum(['admin', 'technician', 'teacher', 'student']).default('student'),
  email: z.string().email().optional(),
});

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const noteSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().optional(),
});

export const passwordResetRequestSchema = z.object({
  username: z.string().min(1),
});

export const passwordResetCompleteSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(12, "Password must be at least 12 chars"),
});

export const accountUpdateSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  password: z.string().min(12, "Password must be at least 12 chars").optional(),
});

export const tagSchema = z.object({
  type: z.enum(['classe', 'specialite', 'groupe', 'categorie']),
  name: z.string().min(1).max(100),
  meta: z.object({}).passthrough().optional(),
  is_default_for_student_view: z.boolean().optional(),
});

export const reactionSchema = z.object({
  reaction_type: z.enum(['up', 'down']),
});
