
import { Router } from 'express';
import { getFeed } from './feed.controller';
import { authenticate } from '../common/middleware';

const router = Router();

router.get('/', authenticate, getFeed);

export default router;
