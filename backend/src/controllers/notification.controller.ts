import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Notification, NotificationType } from '../models/notification.model.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { NotFoundError } from '../middleware/error.middleware.js';

export class NotificationController {
  // Static helper to create notifications from any controller
  static async createNotification(params: {
    recipientId?: string;
    recipientRole?: 'user' | 'admin';
    ticketId?: mongoose.Types.ObjectId;
    customId?: string;
    type: NotificationType;
    title: string;
    message: string;
  }): Promise<void> {
    try {
      await Notification.create({
        recipientId: params.recipientId,
        recipientRole: params.recipientRole,
        ticketId: params.ticketId,
        customId: params.customId,
        type: params.type,
        title: params.title,
        message: params.message,
        read: false,
      });
    } catch (err) {
      console.error('Failed to dispatch notification:', err);
    }
  }

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

  // PATCH /api/notifications/read-all - Mark all user notifications as read
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
}

export const notificationController = new NotificationController();
