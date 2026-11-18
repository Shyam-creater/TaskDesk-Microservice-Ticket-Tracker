import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authLimiter } from '../middleware/rateLimiter.middleware.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', authLimiter, (req, res, next) => {
  authController.register(req, res, next);
});

router.post('/login', authLimiter, (req, res, next) => {
  authController.login(req, res, next);
});

router.get('/me', authenticateToken, (req, res, next) => {
  authController.getMe(req, res, next);
});

router.get('/users', authenticateToken, (req, res, next) => {
  authController.getUsers(req, res, next);
});

export const authRoutes = router;
