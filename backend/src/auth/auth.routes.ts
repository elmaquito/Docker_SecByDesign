import { Router } from 'express';
import * as AuthController from './auth.controller';
import { authenticate } from '../common/middleware';

const router = Router();

// router.post('/register', AuthController.register); // Removed: Registration is admin-only via /users
router.post('/login', AuthController.login);
router.post('/logout', authenticate, AuthController.logout);
router.post('/refresh', AuthController.refresh);
// router.post('/verify-email', AuthController.verifyEmail); // Removed: Not implemented
router.post('/request-password-reset', AuthController.requestPasswordReset);
router.post('/reset-password', AuthController.completePasswordReset);

export default router;
