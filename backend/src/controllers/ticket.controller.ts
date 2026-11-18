import { Response, NextFunction } from 'express';
import { ticketService } from '../services/ticket.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export class TicketController {
  async createTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, description, priority } = req.body;
      const ticket = await ticketService.createTicket({ title, description, priority }, req.user!);
      res.status(201).json({
        data: { ticket },
      });
    } catch (error) {
      next(error);
    }
  }

  async getTickets(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ticketService.getTickets(req.query, req.user!);
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTicketById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await ticketService.getTicketById(req.params.id, req.user!);
      res.status(200).json({
        data: { ticket },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, description } = req.body;
      const ticket = await ticketService.updateTicket(req.params.id, { title, description }, req.user!);
      res.status(200).json({
        data: { ticket },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.body;
      const ticket = await ticketService.updateStatus(req.params.id, status, req.user!);
      res.status(200).json({
        data: { ticket },
      });
    } catch (error) {
      next(error);
    }
  }

  async reviewTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { priority } = req.body;
      const ticket = await ticketService.reviewTicket(req.params.id, priority, req.user!);
      res.status(200).json({
        data: { ticket },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await ticketService.deleteTicket(req.params.id, req.user!);
      res.status(200).json({
        data: { message: 'Ticket deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  async getStats(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await ticketService.getStats();
      res.status(200).json({
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const messages = await ticketService.getMessages(req.params.id, req.user!);
      res.status(200).json({
        data: { messages },
      });
    } catch (error) {
      next(error);
    }
  }

  async postMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { body } = req.body;
      const message = await ticketService.postMessage(req.params.id, body, req.user!);
      res.status(201).json({
        data: { message },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const ticketController = new TicketController();
