import { z } from 'zod';

export const userCreateSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, "Alphanumeric only"),
  password: z.string().min(12, "Password must be at least 12 chars"),
  role: z.enum(['admin', 'technician', 'teacher', 'student']).default('student'),
});

export const accountUpdateSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  password: z.string().min(12, "Password must be at least 12 chars").optional(),
});

export const profileUpdateSchema = z.object({
  classe: z.string().max(50).optional(),
  promotion: z.string().max(50).optional(),
  niveau: z.string().max(20).optional(),
  tags: z.array(z.number().int().positive()).optional()
});
