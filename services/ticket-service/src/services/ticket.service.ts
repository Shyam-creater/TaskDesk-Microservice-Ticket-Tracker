import { ticketRepository, TicketRepository, TicketFilterQuery } from '../repositories/ticket.repository';
import { CreateTicketInput, UpdateTicketInput, TicketQueryInput } from '../schemas/ticket.schema';
import { UserPayload } from '../middleware/auth.middleware';
import { NotFoundError, ForbiddenError } from '../middleware/error.middleware';
import { ITicket } from '../models/ticket.model';
import { ticketsCreatedTotal, ticketsUpdatedTotal, ticketsDeletedTotal } from '../observability/metrics';

export interface PaginatedTicketsResponse {
  tickets: ITicket[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class TicketService {
  private repo: TicketRepository;

  constructor(repo: TicketRepository = ticketRepository) {
    this.repo = repo;
  }

  async createTicket(input: CreateTicketInput, user: UserPayload): Promise<ITicket> {
    const ticket = await this.repo.create({
      title: input.title,
      description: input.description,
      priority: input.priority,
      createdBy: user.id,
    });

    ticketsCreatedTotal.labels(ticket.priority).inc();
    return ticket;
  }

  async getTicketById(id: string, user: UserPayload): Promise<ITicket> {
    const ticket = await this.repo.findById(id);
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // Role-based access check: Users only view their own; Admins view any
    if (user.role !== 'admin' && ticket.createdBy !== user.id) {
      throw new ForbiddenError('You do not have permission to view this ticket');
    }

    return ticket;
  }

  async listTickets(user: UserPayload, query: TicketQueryInput): Promise<PaginatedTicketsResponse> {
    const filter: TicketFilterQuery = {};

    // Standard users only see their own tickets
    if (user.role !== 'admin') {
      filter.createdBy = user.id;
    }

    if (query.status) {
      filter.status = query.status;
    }
    if (query.priority) {
      filter.priority = query.priority;
    }

    const { tickets, total } = await this.repo.findWithFilter(filter, {
      page: query.page,
      limit: query.limit,
    });

    return {
      tickets,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  async updateTicket(id: string, input: UpdateTicketInput, user: UserPayload): Promise<ITicket> {
    const ticket = await this.repo.findById(id);
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // Users can edit only their own tickets; admins can edit any
    if (user.role !== 'admin' && ticket.createdBy !== user.id) {
      throw new ForbiddenError('You do not have permission to update this ticket');
    }

    const updated = await this.repo.updateById(id, input as Partial<ITicket>);
    if (!updated) {
      throw new NotFoundError('Ticket not found');
    }

    if (input.status) {
      ticketsUpdatedTotal.labels(input.status).inc();
    }

    return updated;
  }

  async deleteTicket(id: string, user: UserPayload): Promise<{ message: string; id: string }> {
    const ticket = await this.repo.findById(id);
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // Per specifications: "Admin can see all and delete any"
    if (user.role !== 'admin') {
      throw new ForbiddenError('Only administrators are authorized to delete tickets');
    }

    await this.repo.deleteById(id);
    ticketsDeletedTotal.inc();

    return {
      message: 'Ticket deleted successfully',
      id,
    };
  }
}

export const ticketService = new TicketService();
