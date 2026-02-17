import { Router } from 'express';
import * as TagsController from './tags.controller';
import { authenticate, authorize } from '../common/middleware';

const router = Router();

router.get('/', authenticate, TagsController.listTags);
router.post('/', authenticate, authorize(['admin', 'teacher', 'technician']), TagsController.createTag);
router.patch('/:id', authenticate, authorize(['admin', 'teacher', 'technician']), TagsController.updateTag); // Added updateTag to controller but not exported properly? I need to check. I did export it.
router.delete('/:id', authenticate, authorize(['admin']), TagsController.deleteTag);

export default router;
