import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireInternalKey } from '../middleware/internalAuth.middleware.js';

const router = Router();

// Authenticated user endpoints
router.get('/', authenticateToken, (req, res, next) => {
  notificationController.getNotifications(req, res, next);
});

router.patch('/read-all', authenticateToken, (req, res, next) => {
  notificationController.markAllAsRead(req, res, next);
});

router.patch('/:id/read', authenticateToken, (req, res, next) => {
  notificationController.markAsRead(req, res, next);
});

router.delete('/:id', authenticateToken, (req, res, next) => {
  notificationController.deleteNotification(req, res, next);
});

export const notificationRoutes = router;

// Internal router for service-to-service creation
export const internalNotificationRoutes = Router();
internalNotificationRoutes.post('/notifications', requireInternalKey, (req, res, next) => {
  notificationController.createInternalNotification(req, res, next);
});
