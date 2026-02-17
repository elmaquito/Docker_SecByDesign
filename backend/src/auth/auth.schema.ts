import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const passwordResetRequestSchema = z.object({
  username: z.string().min(1),
});

export const passwordResetCompleteSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(12, "Password must be at least 12 chars"),
});
