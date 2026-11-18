import { Request, Response, NextFunction } from 'express';
import { ticketService, TicketService } from '../services/ticket.service';
import { UnauthorizedError } from '../middleware/error.middleware';

export class TicketController {
  private service: TicketService;

  constructor(service: TicketService = ticketService) {
    this.service = service;
  }

  createTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const ticket = await this.service.createTicket(req.body, req.user);
      res.status(201).json({
        data: { ticket },
      });
    } catch (error) {
      next(error);
    }
  };

  listTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const result = await this.service.listTickets(req.user, req.query as unknown as Parameters<TicketService['listTickets']>[1]);
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getTicketById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const ticket = await this.service.getTicketById(req.params.id, req.user);
      res.status(200).json({
        data: { ticket },
      });
    } catch (error) {
      next(error);
    }
  };

  updateTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const ticket = await this.service.updateTicket(req.params.id, req.body, req.user);
      res.status(200).json({
        data: { ticket },
      });
    } catch (error) {
      next(error);
    }
  };

  deleteTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const result = await this.service.deleteTicket(req.params.id, req.user);
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const ticketController = new TicketController();
