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
