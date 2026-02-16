import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { ProfileService } from './profile.service';
import { z } from 'zod';

const profileSchema = z.object({
  classe: z.string().max(50).optional(),
  promotion: z.string().max(50).optional(),
  niveau: z.string().max(20).optional(),
});

export const createProfileRouter = (pool: Pool, authenticate: any) => {
  const router = Router();
  const profileService = new ProfileService(pool);

  // Get current user's profile
  router.get('/me', authenticate, async (req: any, res: Response) => {
    try {
      const profile = await profileService.getProfileByUserId(req.user.id);
      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }
      res.json(profile);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create or Update profile (Upsert logic often good for 1-1)
  router.post('/me', authenticate, async (req: any, res: Response) => {
    try {
      const data = profileSchema.parse(req.body);
      const existing = await profileService.getProfileByUserId(req.user.id);
      
      let profile;
      if (existing) {
        profile = await profileService.updateProfile(req.user.id, data);
      } else {
        profile = await profileService.createProfile({ userId: req.user.id, ...data });
      }
      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
