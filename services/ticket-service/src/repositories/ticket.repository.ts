import mongoose from 'mongoose';
import { Ticket, ITicket, TicketStatus, TicketPriority } from '../models/ticket.model';
import { Counter } from '../models/counter.model';

export interface CreateTicketData {
  title: string;
  description?: string;
  priority?: TicketPriority;
  createdBy: string;
  createdByName?: string;
  createdByEmail?: string;
  customId?: string;
}

export interface TicketFilterQuery {
  createdBy?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface TicketStatsResult {
  open: number;
  in_review: number;
  in_progress: number;
  resolved: number;
  closed: number;
  total: number;
}

export class TicketRepository {
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
      // Fallback timestamp-based identifier if counter collection unavailable
      return `TD-${Date.now().toString().slice(-4)}`;
    }
  }

  async create(data: CreateTicketData): Promise<ITicket> {
    const customId = data.customId || (await this.getNextCustomId());
    const ticket = new Ticket({
      customId,
      title: data.title,
      description: data.description || '',
      priority: data.priority || 'medium',
      status: 'open',
      createdBy: data.createdBy,
      createdByName: data.createdByName || '',
      createdByEmail: data.createdByEmail || '',
      statusHistory: [],
    });
    return await ticket.save();
  }

  async findById(id: string): Promise<ITicket | null> {
    if (mongoose.Types.ObjectId.isValid(id)) {
      const byObjId = await Ticket.findById(id);
      if (byObjId) return byObjId;
    }
    return await Ticket.findOne({ customId: id.toUpperCase() });
  }

  async findWithFilter(
    filter: TicketFilterQuery,
    pagination: PaginationOptions
  ): Promise<{ tickets: ITicket[]; total: number }> {
    const query: Record<string, unknown> = {};

    if (filter.createdBy) {
      query.createdBy = filter.createdBy;
    }
    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.priority) {
      query.priority = filter.priority;
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pagination.limit)
        .exec(),
      Ticket.countDocuments(query).exec(),
    ]);

    return { tickets, total };
  }

  async updateById(id: string, updateData: Record<string, unknown>): Promise<ITicket | null> {
    const updateOps: Record<string, unknown> = {};
    const setFields: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updateData)) {
      if (key.startsWith('$')) {
        updateOps[key] = value;
      } else {
        setFields[key] = value;
      }
    }

    if (Object.keys(setFields).length > 0) {
      updateOps.$set = setFields;
    }

    let filter: Record<string, unknown> = { _id: id };
    if (!mongoose.Types.ObjectId.isValid(id)) {
      filter = { customId: id.toUpperCase() };
    }

    return await Ticket.findOneAndUpdate(
      filter,
      updateOps,
      { new: true, runValidators: true }
    );
  }

  async deleteById(id: string): Promise<ITicket | null> {
    let filter: Record<string, unknown> = { _id: id };
    if (!mongoose.Types.ObjectId.isValid(id)) {
      filter = { customId: id.toUpperCase() };
    }
    return await Ticket.findOneAndDelete(filter);
  }

  async getStatusStats(): Promise<TicketStatsResult> {
    const counts = await Ticket.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats: TicketStatsResult = {
      open: 0,
      in_review: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
      total: 0,
    };

    for (const item of counts) {
      const statusKey = item._id as TicketStatus;
      if (statusKey in stats) {
        stats[statusKey] = item.count;
      }
      stats.total += item.count;
    }

    return stats;
  }
}

export const ticketRepository = new TicketRepository();
