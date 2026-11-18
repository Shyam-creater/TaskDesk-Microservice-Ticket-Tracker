import mongoose from 'mongoose';
import { Ticket, ITicket, TicketStatus, TicketPriority } from '../models/ticket.model.js';
import { Message, IMessage } from '../models/message.model.js';
import { Counter } from '../models/counter.model.js';
import { User } from '../models/user.model.js';
import { UserPayload } from '../middleware/auth.middleware.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../middleware/error.middleware.js';

export interface CreateTicketDTO {
  title: string;
  description?: string;
  priority?: TicketPriority;
}

export interface UpdateTicketDTO {
  title?: string;
  description?: string;
}

export interface TicketFilterQuery {
  status?: TicketStatus;
  priority?: TicketPriority;
  page?: number;
  limit?: number;
}

const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_review'],
  in_review: ['in_progress', 'open'],
  in_progress: ['resolved', 'in_review'],
  resolved: ['closed', 'open'],
  closed: ['open'],
};

export class TicketService {
  async getNextCustomId(): Promise<string> {
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

  async createTicket(data: CreateTicketDTO, user: UserPayload): Promise<ITicket> {
    if (user.role === 'admin') {
      throw new ForbiddenError('Administrators cannot create tickets');
    }

    const customId = await this.getNextCustomId();
    const ticket = new Ticket({
      customId,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      priority: data.priority || 'medium',
      status: 'open',
      createdBy: user.id,
      createdByName: user.name || user.email.split('@')[0],
      createdByEmail: user.email,
      statusHistory: [],
    });

    await ticket.save();
    return ticket;
  }

  async getTicketById(id: string, user: UserPayload): Promise<ITicket> {
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
    return ticket;
  }

  async getTickets(filter: TicketFilterQuery, user: UserPayload) {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filter.limit) || 10));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (user.role !== 'admin') {
      query.createdBy = user.id;
    }

    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.priority) {
      query.priority = filter.priority;
    }

    const [tickets, total] = await Promise.all([
      Ticket.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      Ticket.countDocuments(query).exec(),
    ]);

    await this.enrichTickets(tickets);

    return {
      tickets,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async updateTicket(id: string, data: UpdateTicketDTO, user: UserPayload): Promise<ITicket> {
    const ticket = await this.getTicketById(id, user);

    if (user.role !== 'admin' && ticket.createdBy !== user.id) {
      throw new ForbiddenError('You can only update your own tickets');
    }

    if (user.role !== 'admin' && ticket.status !== 'open') {
      throw new BadRequestError('Tickets can only be updated while their status is open');
    }

    if (data.title) ticket.title = data.title.trim();
    if (data.description !== undefined) ticket.description = data.description.trim();

    await ticket.save();
    return ticket;
  }

  async updateStatus(id: string, newStatus: TicketStatus, user: UserPayload): Promise<ITicket> {
    if (user.role !== 'admin') {
      throw new ForbiddenError('Only administrators can update ticket status');
    }

    const ticket = await this.getTicketById(id, user);
    const allowed = VALID_TRANSITIONS[ticket.status] || [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestError(`Invalid status transition from ${ticket.status} to ${newStatus}`);
    }

    ticket.statusHistory.push({
      from: ticket.status,
      to: newStatus,
      changedBy: user.id,
      changedAt: new Date(),
    });

    ticket.status = newStatus;
    await ticket.save();
    return ticket;
  }

  async reviewTicket(id: string, priority: TicketPriority | undefined, user: UserPayload): Promise<ITicket> {
    if (user.role !== 'admin') {
      throw new ForbiddenError('Only administrators can review tickets');
    }

    const ticket = await this.getTicketById(id, user);
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

    if (priority) {
      ticket.priority = priority;
    }

    await ticket.save();
    return ticket;
  }

  async deleteTicket(id: string, user: UserPayload): Promise<void> {
    if (user.role !== 'admin') {
      throw new ForbiddenError('Only administrators can delete tickets');
    }

    const ticket = await this.getTicketById(id, user);
    await Promise.all([
      Ticket.findByIdAndDelete(ticket._id),
      Message.deleteMany({ ticketId: ticket._id }),
    ]);
  }

  async getStats(): Promise<{ open: number; in_review: number; in_progress: number; resolved: number; closed: number; total: number }> {
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

    return stats;
  }

  async getMessages(ticketId: string, user: UserPayload): Promise<IMessage[]> {
    const ticket = await this.getTicketById(ticketId, user);
    return await Message.find({ ticketId: ticket._id }).sort({ createdAt: 1 });
  }

  async postMessage(ticketId: string, body: string, user: UserPayload): Promise<IMessage> {
    const ticket = await this.getTicketById(ticketId, user);

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
    return message;
  }
}

export const ticketService = new TicketService();
