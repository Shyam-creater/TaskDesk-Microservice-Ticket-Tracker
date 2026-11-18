import { Router } from 'express';
import { ticketController } from '../controllers/ticket.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.middleware';
import {
  createTicketSchema,
  updateTicketSchema,
  ticketQuerySchema,
  ticketIdParamSchema,
} from '../schemas/ticket.schema';

const router = Router();

router.post(
  '/',
  authenticateToken,
  validateBody(createTicketSchema),
  ticketController.createTicket
);

router.get(
  '/',
  authenticateToken,
  validateQuery(ticketQuerySchema),
  ticketController.listTickets
);

router.get(
  '/:id',
  authenticateToken,
  validateParams(ticketIdParamSchema),
  ticketController.getTicketById
);

router.patch(
  '/:id',
  authenticateToken,
  validateParams(ticketIdParamSchema),
  validateBody(updateTicketSchema),
  ticketController.updateTicket
);

router.delete(
  '/:id',
  authenticateToken,
  validateParams(ticketIdParamSchema),
  requireAdmin,
  ticketController.deleteTicket
);

export const ticketRoutes = router;
