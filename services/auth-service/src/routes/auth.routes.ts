import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { requireInternalKey } from '../middleware/internalAuth.middleware.js';
import { validateBody, registerSchema, loginSchema } from '../middleware/validate.middleware.js';

const router = Router();

// Public routes
router.post('/register', validateBody(registerSchema), (req, res, next) => {
  authController.register(req, res, next);
});

router.post('/login', validateBody(loginSchema), (req, res, next) => {
  authController.login(req, res, next);
});

// Authenticated routes
router.get('/me', authenticateToken, (req, res, next) => {
  authController.getMe(req, res, next);
});

// Admin-only user list
router.get('/users', authenticateToken, requireRole('admin'), (req, res, next) => {
  authController.getUsers(req, res, next);
});

export const authRoutes = router;

// Internal router for service-to-service communication
export const internalAuthRoutes = Router();
internalAuthRoutes.get('/users', requireInternalKey, (req, res, next) => {
  authController.getInternalUsers(req, res, next);
});
