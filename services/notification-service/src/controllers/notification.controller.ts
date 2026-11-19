import { Request, Response, NextFunction } from 'express';
import { Notification, NotificationType } from '../models/notification.model.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { NotFoundError } from '../middleware/error.middleware.js';

export class NotificationController {
  // GET /api/notifications - List current user's notifications + unread count
  async getNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const query =
        user.role === 'admin'
          ? { $or: [{ recipientId: user.id }, { recipientRole: 'admin' }] }
          : { recipientId: user.id };

      const [notifications, unreadCount] = await Promise.all([
        Notification.find(query).sort({ createdAt: -1 }).limit(30),
        Notification.countDocuments({ ...query, read: false }),
      ]);

      res.status(200).json({
        data: {
          notifications,
          unreadCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/notifications/:id/read - Mark single notification as read
  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const notification = await Notification.findById(id);
      if (!notification) {
        throw new NotFoundError('Notification not found');
      }

      notification.read = true;
      await notification.save();

      res.status(200).json({
        data: { notification },
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/notifications/read-all - Mark all as read
  async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const query =
        user.role === 'admin'
          ? { $or: [{ recipientId: user.id }, { recipientRole: 'admin' }] }
          : { recipientId: user.id };

      await Notification.updateMany({ ...query, read: false }, { $set: { read: true } });

      res.status(200).json({
        data: { message: 'All notifications marked as read' },
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/notifications/:id - Delete a notification
  async deleteNotification(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await Notification.findByIdAndDelete(id);

      res.status(200).json({
        data: { message: 'Notification deleted' },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /internal/notifications - Internal service-to-service creation
  async createInternalNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recipientId, recipientRole, ticketId, customId, type, title, message } = req.body;

      const notification = await Notification.create({
        recipientId,
        recipientRole,
        ticketId,
        customId,
        type: type as NotificationType,
        title,
        message,
        read: false,
      });

      res.status(201).json({
        data: { notification },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
