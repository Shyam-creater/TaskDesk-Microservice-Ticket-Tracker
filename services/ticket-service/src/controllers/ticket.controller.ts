import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import { Ticket, ITicket, TicketStatus, TicketPriority } from '../models/ticket.model.js';
import { Message } from '../models/message.model.js';
import { Counter } from '../models/counter.model.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware/error.middleware.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_review'],
  in_review: ['in_progress', 'open'],
  in_progress: ['resolved', 'in_review'],
  resolved: ['closed', 'open'],
  closed: ['open'],
};

export class TicketController {
  // Fire-and-forget notification dispatch to notification-service
  private async dispatchNotification(
    payload: {
      recipientId?: string;
      recipientRole?: 'user' | 'admin';
      ticketId?: mongoose.Types.ObjectId;
      customId?: string;
      type: string;
      title: string;
      message: string;
    },
    correlationId?: string
  ): Promise<void> {
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4003';
      const internalKey = process.env.INTERNAL_SERVICE_KEY;
      await axios.post(`${notificationServiceUrl}/internal/notifications`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': internalKey || '',
          'X-Correlation-ID': correlationId || '',
        },
        timeout: 3000,
      });
    } catch (err: any) {
      console.warn(`[ticket-service] Fire-and-forget notification dispatch failed: ${err.message}`);
    }
  }

  // Atomic sequential customId generation (TD-XXXX)
  private async getNextCustomId(): Promise<string> {
    try {
      const counter = await Counter.findByIdAndUpdate(
        'ticketId',
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      return `TD-${counter.seq}`;
    } catch {
      return `TD-${Date.now().toString().slice(-4)}`;
    }
  }

  // Enrich tickets with creator details via Auth Service inter-service HTTP call
  private async enrichTickets(tickets: ITicket[], correlationId?: string): Promise<ITicket[]> {
    const missingUserIds = new Set<string>();

    for (const t of tickets) {
      if (!t.customId) {
        const fallback = `TD-${t._id.toString().slice(-4).toUpperCase()}`;
        t.set('customId', fallback);
        t.customId = fallback;
      }
      if (!t.createdByName) {
        missingUserIds.add(t.createdBy);
      }
    }

    if (missingUserIds.size > 0) {
      try {
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
        const internalKey = process.env.INTERNAL_SERVICE_KEY;
        const res = await axios.get(
          `${authServiceUrl}/internal/users?ids=${Array.from(missingUserIds).join(',')}`,
          {
            headers: {
              'X-Internal-Key': internalKey || '',
              'X-Correlation-ID': correlationId || '',
            },
            timeout: 2000,
          }
        );
        const users: Array<{ id: string; name: string; email: string }> = res.data?.data?.users || [];
        const userMap = new Map(users.map((u) => [u.id, u]));

        for (const t of tickets) {
          if (!t.createdByName && userMap.has(t.createdBy)) {
            const user = userMap.get(t.createdBy)!;
            t.set('createdByName', user.name);
            t.set('createdByEmail', user.email);
            t.createdByName = user.name;
            t.createdByEmail = user.email;
          }
        }
      } catch (err: any) {
        console.warn(`[ticket-service] Inter-service user resolution fallback: ${err.message}`);
      }
    }

    return tickets;
  }

  // POST /api/tickets - Create Ticket (User only)
  async createTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      if (user.role === 'admin') {
        throw new ForbiddenError('Administrators cannot create tickets');
      }

      const { title, description, priority } = req.body;
      const customId = await this.getNextCustomId();

      const ticket = new Ticket({
        customId,
        title: title.trim(),
        description: description?.trim() || '',
        priority: priority || 'medium',
        status: 'open',
        createdBy: user.id,
        createdByName: user.name || user.email.split('@')[0],
        createdByEmail: user.email,
        statusHistory: [],
      });

      await ticket.save();

      // Dispatch notification to Administrators (fire-and-forget)
      this.dispatchNotification(
        {
          recipientId: 'admin',
          recipientRole: 'admin',
          ticketId: ticket._id,
          customId: ticket.customId,
          type: 'ticket_created',
          title: `New Ticket: ${ticket.customId}`,
          message: `${ticket.createdByName} opened: "${ticket.title}"`,
        },
        (req as any).correlationId
      );

      res.status(201).json({
        data: { ticket },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/tickets - List tickets (scoped for users, global for admins)
  async getTickets(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { status, priority, page = '1', limit = '50', search } = req.query;

      const query: Record<string, any> = {};

      if (user.role !== 'admin') {
        query.createdBy = user.id;
      }

      if (status && status !== 'all') {
        query.status = status;
      }

      if (priority && priority !== 'all') {
        query.priority = priority;
      }

      if (search && typeof search === 'string' && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$or = [{ title: searchRegex }, { description: searchRegex }, { customId: searchRegex }];
      }

      const pageNum = Math.max(1, parseInt(page as string, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
      const skip = (pageNum - 1) * limitNum;

      const [tickets, total] = await Promise.all([
        Ticket.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
        Ticket.countDocuments(query),
      ]);

      await this.enrichTickets(tickets, (req as any).correlationId);

      res.status(200).json({
        data: {
          tickets,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/tickets/stats - Status counts for Admin dashboard
  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        throw new ForbiddenError('Only administrators can access ticket stats');
      }

      const counts = await Ticket.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);

      const stats: Record<TicketStatus | 'total', number> = {
        open: 0,
        in_review: 0,
        in_progress: 0,
        resolved: 0,
        closed: 0,
        total: 0,
      };

      for (const item of counts) {
        const key = item._id as TicketStatus;
        if (key in stats) {
          stats[key] = item.count;
        }
        stats.total += item.count;
      }

      res.status(200).json({
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/tickets/:id - Single ticket details
  async getTicketById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;

      let ticket: ITicket | null = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        ticket = await Ticket.findById(id);
      }
      if (!ticket) {
        ticket = await Ticket.findOne({ customId: id.toUpperCase() });
      }

      if (!ticket) {
        throw new NotFoundError('Ticket not found');
      }

      if (user.role !== 'admin' && ticket.createdBy !== user.id) {
        throw new NotFoundError('Ticket not found');
      }

      await this.enrichTickets([ticket], (req as any).correlationId);

      res.status(200).json({
        data: { ticket },
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/tickets/:id - Update Title/Description (User only, open only)
  async updateTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      if (user.role === 'admin') {
        throw new ForbiddenError('Administrators cannot edit user ticket descriptions or titles');
      }

      const { id } = req.params;
      let ticket: ITicket | null = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        ticket = await Ticket.findById(id);
      }
      if (!ticket) {
        ticket = await Ticket.findOne({ customId: id.toUpperCase() });
      }

      if (!ticket) {
        throw new NotFoundError('Ticket not found');
      }

      if (ticket.createdBy !== user.id) {
        throw new NotFoundError('Ticket not found');
      }

      if (ticket.status !== 'open') {
        throw new ForbiddenError('Tickets can only be edited while in open status');
      }

      const { title, description } = req.body;
      if (title !== undefined) {
        ticket.title = title.trim();
      }
      if (description !== undefined) {
        ticket.description = description.trim();
      }

      await ticket.save();
      await this.enrichTickets([ticket], (req as any).correlationId);

      res.status(200).json({
        data: { ticket },
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/tickets/:id/status - Update Status (Admin only)
  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        throw new ForbiddenError('Only administrators can update ticket status');
      }

      const { status: nextStatus } = req.body;
      const { id } = req.params;

      let ticket: ITicket | null = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        ticket = await Ticket.findById(id);
      }
      if (!ticket) {
        ticket = await Ticket.findOne({ customId: id.toUpperCase() });
      }

      if (!ticket) {
        throw new NotFoundError('Ticket not found');
      }

      const allowed = VALID_TRANSITIONS[ticket.status] || [];
      if (!allowed.includes(nextStatus)) {
        throw new BadRequestError(`Invalid status transition from ${ticket.status} to ${nextStatus}`);
      }

      ticket.statusHistory.push({
        from: ticket.status,
        to: nextStatus,
        changedBy: user.id,
        changedAt: new Date(),
      });

      ticket.status = nextStatus;
      await ticket.save();
      await this.enrichTickets([ticket], (req as any).correlationId);

      // Dispatch notification to creator
      this.dispatchNotification(
        {
          recipientId: ticket.createdBy,
          ticketId: ticket._id,
          customId: ticket.customId,
          type: 'status_updated',
          title: `Ticket ${ticket.customId} Updated`,
          message: `Status changed to ${nextStatus.replace('_', ' ').toUpperCase()} by Support`,
        },
        (req as any).correlationId
      );

      res.status(200).json({
        data: { ticket },
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/tickets/:id/review - Review Ticket (Admin only)
  async reviewTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        throw new ForbiddenError('Only administrators can review tickets');
      }

      const { id } = req.params;
      let ticket: ITicket | null = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        ticket = await Ticket.findById(id);
      }
      if (!ticket) {
        ticket = await Ticket.findOne({ customId: id.toUpperCase() });
      }

      if (!ticket) {
        throw new NotFoundError('Ticket not found');
      }

      ticket.reviewedBy = user.id;
      ticket.reviewedAt = new Date();

      if (ticket.status === 'open') {
        ticket.statusHistory.push({
          from: 'open',
          to: 'in_review',
          changedBy: user.id,
          changedAt: new Date(),
        });
        ticket.status = 'in_review';
      }

      if (req.body.priority) {
        ticket.priority = req.body.priority as TicketPriority;
      }

      await ticket.save();
      await this.enrichTickets([ticket], (req as any).correlationId);

      // Dispatch notification to creator
      this.dispatchNotification(
        {
          recipientId: ticket.createdBy,
          ticketId: ticket._id,
          customId: ticket.customId,
          type: 'ticket_reviewed',
          title: `Ticket ${ticket.customId} Reviewed`,
          message: `Your ticket has been reviewed by the Support Team`,
        },
        (req as any).correlationId
      );

      res.status(200).json({
        data: { ticket },
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/tickets/:id - Delete Ticket (Admin only)
  async deleteTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        throw new ForbiddenError('Only administrators can delete tickets');
      }

      const { id } = req.params;
      let ticket: ITicket | null = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        ticket = await Ticket.findById(id);
      }
      if (!ticket) {
        ticket = await Ticket.findOne({ customId: id.toUpperCase() });
      }

      if (!ticket) {
        throw new NotFoundError('Ticket not found');
      }

      await Promise.all([
        Ticket.findByIdAndDelete(ticket._id),
        Message.deleteMany({ ticketId: ticket._id }),
      ]);

      res.status(200).json({
        data: { message: 'Ticket deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/tickets/:id/messages - Get Chat Messages
  async getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;

      let ticket: ITicket | null = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        ticket = await Ticket.findById(id);
      }
      if (!ticket) {
        ticket = await Ticket.findOne({ customId: id.toUpperCase() });
      }

      if (!ticket) {
        throw new NotFoundError('Ticket not found');
      }

      if (user.role !== 'admin' && ticket.createdBy !== user.id) {
        throw new NotFoundError('Ticket not found');
      }

      const messages = await Message.find({ ticketId: ticket._id }).sort({ createdAt: 1 });

      res.status(200).json({
        data: { messages },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/tickets/:id/messages - Post Chat Message
  async postMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { body } = req.body;

      let ticket: ITicket | null = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        ticket = await Ticket.findById(id);
      }
      if (!ticket) {
        ticket = await Ticket.findOne({ customId: id.toUpperCase() });
      }

      if (!ticket) {
        throw new NotFoundError('Ticket not found');
      }

      if (user.role !== 'admin' && ticket.createdBy !== user.id) {
        throw new NotFoundError('Ticket not found');
      }

      if (user.role === 'user' && ticket.status === 'closed') {
        throw new ForbiddenError('Cannot send messages on a closed ticket');
      }

      const message = new Message({
        ticketId: ticket._id,
        senderId: user.id,
        senderRole: user.role,
        body: body.trim(),
      });

      await message.save();

      // Dispatch chat notification
      if (user.role === 'admin') {
        this.dispatchNotification(
          {
            recipientId: ticket.createdBy,
            ticketId: ticket._id,
            customId: ticket.customId,
            type: 'message_received',
            title: `New Reply on ${ticket.customId}`,
            message: `Support replied: "${body.trim().slice(0, 60)}${body.trim().length > 60 ? '...' : ''}"`,
          },
          (req as any).correlationId
        );
      } else {
        this.dispatchNotification(
          {
            recipientRole: 'admin',
            ticketId: ticket._id,
            customId: ticket.customId,
            type: 'message_received',
            title: `New Message on ${ticket.customId}`,
            message: `${user.name || 'User'} sent a message on ${ticket.customId}: "${body.trim().slice(0, 60)}${body.trim().length > 60 ? '...' : ''}"`,
          },
          (req as any).correlationId
        );
      }

      res.status(201).json({
        data: { message },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const ticketController = new TicketController();
