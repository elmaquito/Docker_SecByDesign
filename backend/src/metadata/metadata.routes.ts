import { Router } from 'express';
import * as MetadataController from './metadata.controller';
import { authenticate } from '../common/middleware';

const router = Router();

router.get('/themes', authenticate, MetadataController.listThemes);
router.get('/categories', authenticate, MetadataController.listCategories);

export default router;
