import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { CategoryService } from './category.service';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  target_type: z.enum(['classe', 'promotion', 'niveau', 'all']),
  target_value: z.string().optional(),
});

export const createCategoryRouter = (pool: Pool, authenticate: any, authorize: any) => {
  const router = Router();
  const categoryService = new CategoryService(pool);

  router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
      const categories = await categoryService.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/', authenticate, authorize(['admin', 'teacher']), async (req: Request, res: Response) => {
    try {
      const data = categorySchema.parse(req.body);
      // @ts-ignore
      const category = await categoryService.createCategory(data);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
