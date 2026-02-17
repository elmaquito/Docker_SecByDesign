import { Router } from 'express';
import * as UserController from './user.controller';
import { authenticate } from '../common/middleware';
import { authorize } from '../common/middleware';

const router = Router();

// Public setup route (only works if no users exist)
router.post('/setup', UserController.setupAdmin);

// Protected routes
router.post('/', authenticate, authorize(['admin', 'technician']), UserController.createUser);
router.get('/', authenticate, authorize(['admin', 'technician', 'teacher']), UserController.listUsers);
router.get('/me', authenticate, UserController.getAccount);
router.put('/me', authenticate, UserController.updateAccount);

// GDPR Routes
router.get('/:id/export', authenticate, UserController.exportData);
router.delete('/:id', authenticate, UserController.deleteUser);

export default router;
