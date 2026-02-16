import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { ThemeService } from './theme.service';
import { z } from 'zod';

const themeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().max(20).optional(),
});

export const createThemeRouter = (pool: Pool, authenticate: any, authorize: any) => {
  const router = Router();
  const themeService = new ThemeService(pool);

  // Public: List all themes
  router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
      const themes = await themeService.getAllThemes();
      res.json(themes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin/Teacher: Create theme
  router.post('/', authenticate, authorize(['admin', 'teacher']), async (req: any, res: Response) => {
    try {
      const data = themeSchema.parse(req.body);
      const theme = await themeService.createTheme({ ...data, created_by: req.user.id });
      res.status(201).json(theme);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
