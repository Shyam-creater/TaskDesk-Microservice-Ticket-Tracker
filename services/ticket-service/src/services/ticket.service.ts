import { ticketRepository, TicketRepository, TicketFilterQuery, TicketStatsResult } from '../repositories/ticket.repository';
import { messageRepository, MessageRepository } from '../repositories/message.repository';
import {
  CreateTicketInput,
  UpdateTicketInput,
  UpdateStatusInput,
  ReviewTicketInput,
  CreateMessageInput,
  TicketQueryInput,
} from '../schemas/ticket.schema';
import { UserPayload } from '../middleware/auth.middleware';
import { NotFoundError, ForbiddenError, BadRequestError } from '../middleware/error.middleware';
import { ITicket, TicketStatus } from '../models/ticket.model';
import { IMessage } from '../models/message.model';
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
  private msgRepo: MessageRepository;

  constructor(repo: TicketRepository = ticketRepository, msgRepo: MessageRepository = messageRepository) {
    this.repo = repo;
    this.msgRepo = msgRepo;
  }

  async createTicket(input: CreateTicketInput, user: UserPayload): Promise<ITicket> {
    // Per requirement: Only Users can create tickets; Admins cannot
    if (user.role === 'admin') {
      throw new ForbiddenError('Administrators cannot create tickets');
    }

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

    // Per rules: Return 404 when a user requests another user's ticket
    if (user.role !== 'admin' && ticket.createdBy !== user.id) {
      throw new NotFoundError('Ticket not found');
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

  async updateTicketContent(id: string, input: UpdateTicketInput, user: UserPayload): Promise<ITicket> {
    const ticket = await this.repo.findById(id);
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // Role check: User can edit own ticket only
    if (user.role !== 'admin' && ticket.createdBy !== user.id) {
      throw new NotFoundError('Ticket not found');
    }

    // Requirement: User edits own ticket's title/description ONLY while 'open'
    if (ticket.status !== 'open') {
      throw new BadRequestError(`Cannot edit ticket while in '${ticket.status}' status. Tickets can only be edited while open.`);
    }

    const updatePayload: Partial<ITicket> = {};
    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.description !== undefined) updatePayload.description = input.description;

    const updated = await this.repo.updateById(id, updatePayload);
    if (!updated) {
      throw new NotFoundError('Ticket not found');
    }

    return updated;
  }

  async updateTicketStatus(id: string, input: UpdateStatusInput, user: UserPayload): Promise<ITicket> {
    // Only admin can change status
    if (user.role !== 'admin') {
      throw new ForbiddenError('Only administrators can change ticket status');
    }

    const ticket = await this.repo.findById(id);
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    const currentStatus = ticket.status;
    const targetStatus = input.status;

    if (currentStatus === targetStatus) {
      return ticket;
    }

    // Validate allowed status transitions:
    // open -> in_review -> in_progress -> resolved -> closed
    // resolved/closed -> open (reopen)
    const allowedTransitions: Record<TicketStatus, TicketStatus[]> = {
      open: ['in_review'],
      in_review: ['in_progress'],
      in_progress: ['resolved'],
      resolved: ['closed', 'open'],
      closed: ['open'],
    };

    const validNextStates = allowedTransitions[currentStatus] || [];
    if (!validNextStates.includes(targetStatus)) {
      throw new BadRequestError(
        `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: ${validNextStates.join(', ') || 'none'}`
      );
    }

    const historyItem = {
      from: currentStatus,
      to: targetStatus,
      changedBy: user.id,
      changedAt: new Date(),
    };

    const updated = await this.repo.updateById(id, {
      status: targetStatus,
      $push: { statusHistory: historyItem },
    } as unknown as Partial<ITicket>);

    if (!updated) {
      throw new NotFoundError('Ticket not found');
    }

    ticketsUpdatedTotal.labels(targetStatus).inc();
    return updated;
  }

  async reviewTicket(id: string, input: ReviewTicketInput, user: UserPayload): Promise<ITicket> {
    if (user.role !== 'admin') {
      throw new ForbiddenError('Only administrators can review tickets');
    }

    const ticket = await this.repo.findById(id);
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    const updatePayload: Record<string, unknown> = {
      reviewedBy: user.id,
      reviewedAt: new Date(),
    };

    if (input.priority) {
      updatePayload.priority = input.priority;
    }

    // If ticket was open, automatically transition to in_review
    if (ticket.status === 'open') {
      updatePayload.status = 'in_review';
      updatePayload.$push = {
        statusHistory: {
          from: 'open',
          to: 'in_review',
          changedBy: user.id,
          changedAt: new Date(),
        },
      };
      ticketsUpdatedTotal.labels('in_review').inc();
    }

    const updated = await this.repo.updateById(id, updatePayload as Partial<ITicket>);
    if (!updated) {
      throw new NotFoundError('Ticket not found');
    }

    return updated;
  }

  async deleteTicket(id: string, user: UserPayload): Promise<{ message: string; id: string }> {
    if (user.role !== 'admin') {
      throw new ForbiddenError('Only administrators are authorized to delete tickets');
    }

    const ticket = await this.repo.findById(id);
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    await Promise.all([
      this.repo.deleteById(id),
      this.msgRepo.deleteByTicketId(id),
    ]);

    ticketsDeletedTotal.inc();

    return {
      message: 'Ticket deleted successfully',
      id,
    };
  }

  async getStats(user: UserPayload): Promise<TicketStatsResult> {
    if (user.role !== 'admin') {
      throw new ForbiddenError('Administrator privileges required to view ticket statistics');
    }

    return await this.repo.getStatusStats();
  }

  async getMessages(ticketId: string, user: UserPayload): Promise<IMessage[]> {
    const ticket = await this.repo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // Ownership check: user can only view chat on own ticket
    if (user.role !== 'admin' && ticket.createdBy !== user.id) {
      throw new NotFoundError('Ticket not found');
    }

    return await this.msgRepo.findByTicketId(ticketId);
  }

  async postMessage(ticketId: string, input: CreateMessageInput, user: UserPayload): Promise<IMessage> {
    const ticket = await this.repo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // Ownership check: user can only chat on own ticket
    if (user.role !== 'admin' && ticket.createdBy !== user.id) {
      throw new NotFoundError('Ticket not found');
    }

    // Requirement: Users cannot post messages on a closed ticket. Admin can reopen it.
    if (user.role !== 'admin' && ticket.status === 'closed') {
      throw new BadRequestError('Cannot send messages to a closed ticket. An administrator must reopen it.');
    }

    // senderRole is ALWAYS taken from the authenticated JWT user payload, never from client body
    return await this.msgRepo.create({
      ticketId,
      senderId: user.id,
      senderRole: user.role,
      body: input.body,
    });
  }
}

export const ticketService = new TicketService();
