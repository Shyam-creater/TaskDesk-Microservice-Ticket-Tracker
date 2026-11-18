import { Router } from 'express';
import { ticketController } from '../controllers/ticket.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { validateBody, validateParams } from '../middleware/validate.middleware.js';
import {
  createTicketSchema,
  updateTicketSchema,
  updateStatusSchema,
  reviewTicketSchema,
  createMessageSchema,
  ticketIdParamSchema,
} from '../schemas/ticket.schema.js';

const router = Router();

// Stats must be defined before /:id param route
router.get('/stats', authenticateToken, requireRole('admin'), (req, res, next) => {
  ticketController.getStats(req, res, next);
});

router.post('/', authenticateToken, validateBody(createTicketSchema), (req, res, next) => {
  ticketController.createTicket(req, res, next);
});

router.get('/', authenticateToken, (req, res, next) => {
  ticketController.getTickets(req, res, next);
});

router.get('/:id', authenticateToken, validateParams(ticketIdParamSchema), (req, res, next) => {
  ticketController.getTicketById(req, res, next);
});

router.patch(
  '/:id',
  authenticateToken,
  validateParams(ticketIdParamSchema),
  validateBody(updateTicketSchema),
  (req, res, next) => {
    ticketController.updateTicket(req, res, next);
  }
);

router.patch(
  '/:id/status',
  authenticateToken,
  requireRole('admin'),
  validateParams(ticketIdParamSchema),
  validateBody(updateStatusSchema),
  (req, res, next) => {
    ticketController.updateStatus(req, res, next);
  }
);

router.patch(
  '/:id/review',
  authenticateToken,
  requireRole('admin'),
  validateParams(ticketIdParamSchema),
  validateBody(reviewTicketSchema),
  (req, res, next) => {
    ticketController.reviewTicket(req, res, next);
  }
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole('admin'),
  validateParams(ticketIdParamSchema),
  (req, res, next) => {
    ticketController.deleteTicket(req, res, next);
  }
);

router.get('/:id/messages', authenticateToken, validateParams(ticketIdParamSchema), (req, res, next) => {
  ticketController.getMessages(req, res, next);
});

router.post(
  '/:id/messages',
  authenticateToken,
  validateParams(ticketIdParamSchema),
  validateBody(createMessageSchema),
  (req, res, next) => {
    ticketController.postMessage(req, res, next);
  }
);

export const ticketRoutes = router;
