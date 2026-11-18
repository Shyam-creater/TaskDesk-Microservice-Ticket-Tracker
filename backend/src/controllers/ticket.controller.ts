import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Ticket, ITicket, TicketStatus, TicketPriority } from '../models/ticket.model.js';
import { Message } from '../models/message.model.js';
import { Counter } from '../models/counter.model.js';
import { User } from '../models/user.model.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../middleware/error.middleware.js';

const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_review'],
  in_review: ['in_progress', 'open'],
  in_progress: ['resolved', 'in_review'],
  resolved: ['closed', 'open'],
  closed: ['open'],
};

export class TicketController {
  // Generate sequential custom Ticket ID (e.g., TD-1001, TD-1002)
  private async getNextCustomId(): Promise<string> {
    try {
      const existingCounter = await Counter.findById('ticket_seq');
      if (!existingCounter) {
        const tickets = await Ticket.find({ customId: { $regex: /^TD-\d+$/ } })
          .select('customId')
          .exec();
        let maxNum = 1000;
        for (const t of tickets) {
          if (t.customId) {
            const match = t.customId.match(/^TD-(\d+)$/);
            if (match) {
              const n = parseInt(match[1], 10);
              if (n > maxNum) maxNum = n;
            }
          }
        }
        await Counter.findByIdAndUpdate(
          'ticket_seq',
          { $setOnInsert: { seq: maxNum } },
          { upsert: true }
        );
      }

      const counter = await Counter.findByIdAndUpdate(
        'ticket_seq',
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      return `TD-${counter.seq}`;
    } catch {
      return `TD-${Date.now().toString().slice(-4)}`;
    }
  }

  // Enrich tickets with creator details and fallback IDs if missing
  private async enrichTickets(tickets: ITicket[]): Promise<ITicket[]> {
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
      const users = await User.find({ _id: { $in: Array.from(missingUserIds) } });
      const userMap = new Map(users.map((u) => [u._id.toString(), u]));

      for (const t of tickets) {
        if (!t.createdByName && userMap.has(t.createdBy)) {
          const user = userMap.get(t.createdBy)!;
          t.set('createdByName', user.name);
          t.set('createdByEmail', user.email);
          t.createdByName = user.name;
          t.createdByEmail = user.email;
        }
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
      if (!title || title.trim().length < 3) {
        throw new BadRequestError('Title must be at least 3 characters long');
      }

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
      res.status(201).json({
        data: { ticket },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/tickets - List tickets (filtered by role and query params)
  async getTickets(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const skip = (page - 1) * limit;

      const query: Record<string, unknown> = {};

      // Regular users only see their own tickets
      if (user.role !== 'admin') {
        query.createdBy = user.id;
      }

      if (req.query.status && req.query.status !== 'all') {
        query.status = req.query.status;
      }
      if (req.query.priority && req.query.priority !== 'all') {
        query.priority = req.query.priority;
      }

      const [tickets, total] = await Promise.all([
        Ticket.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
        Ticket.countDocuments(query).exec(),
      ]);

      await this.enrichTickets(tickets);

      res.status(200).json({
        data: {
          tickets,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/tickets/stats - Ticket status count aggregation
  async getStats(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const counts = await Ticket.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const stats = {
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

      await this.enrichTickets([ticket]);

      res.status(200).json({
        data: { ticket },
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/tickets/:id - Edit Title & Description (User creator only, open status only)
  async updateTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;

      if (user.role === 'admin') {
        throw new ForbiddenError(
          'Administrators cannot edit ticket title or description. Only the user who created the ticket can edit content.'
        );
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
        throw new ForbiddenError('You can only update your own tickets');
      }

      if (ticket.status !== 'open') {
        throw new BadRequestError('Tickets can only be updated while their status is open');
      }

      const { title, description } = req.body;
      if (title !== undefined) {
        if (!title.trim() || title.trim().length < 3) {
          throw new BadRequestError('Title must be at least 3 characters long');
        }
        ticket.title = title.trim();
      }

      if (description !== undefined) {
        ticket.description = description.trim();
      }

      await ticket.save();
      await this.enrichTickets([ticket]);

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
      if (!nextStatus) {
        throw new BadRequestError('Next status is required');
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
      await this.enrichTickets([ticket]);

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
      await this.enrichTickets([ticket]);

      res.status(200).json({
        data: { ticket },
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/tickets/:id - Delete Ticket & Messages (Admin only)
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

  // GET /api/tickets/:id/messages - Get Ticket Chat Messages
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

  // POST /api/tickets/:id/messages - Send Chat Message
  async postMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { body } = req.body;

      if (!body || !body.trim()) {
        throw new BadRequestError('Message body cannot be empty');
      }

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

      res.status(201).json({
        data: { message },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const ticketController = new TicketController();
