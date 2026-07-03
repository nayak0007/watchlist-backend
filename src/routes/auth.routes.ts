import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply stricter rate limiting to auth routes
router.use(authLimiter);

// POST /api/auth/signup
router.post('/signup', validate(authController.signupSchema), authController.signup);

// POST /api/auth/login
router.post('/login', validate(authController.loginSchema), authController.login);

// POST /api/auth/logout
router.post('/logout', authenticate, authController.logout);

// POST /api/auth/refresh
router.post('/refresh', validate(authController.refreshSchema), authController.refresh);

// GET /api/auth/me
router.get('/me', authenticate, authController.getProfile);

export default router;
