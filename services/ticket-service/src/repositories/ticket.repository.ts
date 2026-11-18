import { Ticket, ITicket, TicketStatus, TicketPriority } from '../models/ticket.model';

export interface CreateTicketData {
  title: string;
  description?: string;
  priority?: TicketPriority;
  createdBy: string;
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
  async create(data: CreateTicketData): Promise<ITicket> {
    const ticket = new Ticket({
      title: data.title,
      description: data.description || '',
      priority: data.priority || 'medium',
      status: 'open',
      createdBy: data.createdBy,
      statusHistory: [],
    });
    return await ticket.save();
  }

  async findById(id: string): Promise<ITicket | null> {
    return await Ticket.findById(id);
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

    return await Ticket.findByIdAndUpdate(
      id,
      updateOps,
      { new: true, runValidators: true }
    );
  }

  async deleteById(id: string): Promise<ITicket | null> {
    return await Ticket.findByIdAndDelete(id);
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
