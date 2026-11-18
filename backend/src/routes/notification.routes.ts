import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/notifications - List current user's notifications + unread count
router.get('/', authenticateToken, (req, res, next) => {
  notificationController.getNotifications(req, res, next);
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', authenticateToken, (req, res, next) => {
  notificationController.markAllAsRead(req, res, next);
});

// PATCH /api/notifications/:id/read - Mark single as read
router.patch('/:id/read', authenticateToken, (req, res, next) => {
  notificationController.markAsRead(req, res, next);
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', authenticateToken, (req, res, next) => {
  notificationController.deleteNotification(req, res, next);
});

export const notificationRoutes = router;
