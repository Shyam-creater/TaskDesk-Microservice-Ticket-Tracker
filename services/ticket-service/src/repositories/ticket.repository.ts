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

export class TicketRepository {
  async create(data: CreateTicketData): Promise<ITicket> {
    const ticket = new Ticket({
      title: data.title,
      description: data.description || '',
      priority: data.priority || 'medium',
      createdBy: data.createdBy,
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

  async updateById(id: string, updateData: Partial<ITicket>): Promise<ITicket | null> {
    return await Ticket.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  async deleteById(id: string): Promise<ITicket | null> {
    return await Ticket.findByIdAndDelete(id);
  }
}

export const ticketRepository = new TicketRepository();
