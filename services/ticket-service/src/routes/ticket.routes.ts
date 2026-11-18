import { Router } from 'express';
import { ticketController } from '../controllers/ticket.controller';
import { authenticateToken, requireAdmin, requireUser } from '../middleware/auth.middleware';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.middleware';
import {
  createTicketSchema,
  updateTicketSchema,
  updateStatusSchema,
  reviewTicketSchema,
  createMessageSchema,
  ticketQuerySchema,
  ticketIdParamSchema,
} from '../schemas/ticket.schema';

const router = Router();

// Create ticket (User only - Admins cannot create tickets)
router.post(
  '/',
  authenticateToken,
  requireUser,
  validateBody(createTicketSchema),
  ticketController.createTicket
);

// List tickets (Users see own, Admin sees all)
router.get(
  '/',
  authenticateToken,
  validateQuery(ticketQuerySchema),
  ticketController.listTickets
);

// Admin dashboard summary statistics (Must precede /:id)
router.get(
  '/stats',
  authenticateToken,
  requireAdmin,
  ticketController.getStats
);

// Get single ticket details (Owner or Admin; 404 if not owner)
router.get(
  '/:id',
  authenticateToken,
  validateParams(ticketIdParamSchema),
  ticketController.getTicketById
);

// Edit ticket content (Owner edits title/desc while 'open')
router.patch(
  '/:id',
  authenticateToken,
  validateParams(ticketIdParamSchema),
  validateBody(updateTicketSchema),
  ticketController.updateTicketContent
);

// Admin status change with validated transitions (Admin only)
router.patch(
  '/:id/status',
  authenticateToken,
  requireAdmin,
  validateParams(ticketIdParamSchema),
  validateBody(updateStatusSchema),
  ticketController.updateTicketStatus
);

// Admin review ticket (Admin only)
router.patch(
  '/:id/review',
  authenticateToken,
  requireAdmin,
  validateParams(ticketIdParamSchema),
  validateBody(reviewTicketSchema),
  ticketController.reviewTicket
);

// Delete ticket (Admin only)
router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  validateParams(ticketIdParamSchema),
  ticketController.deleteTicket
);

// Chat messages thread (Owner or Admin)
router.get(
  '/:id/messages',
  authenticateToken,
  validateParams(ticketIdParamSchema),
  ticketController.getMessages
);

// Post chat message (Owner or Admin; user blocked on closed ticket)
router.post(
  '/:id/messages',
  authenticateToken,
  validateParams(ticketIdParamSchema),
  validateBody(createMessageSchema),
  ticketController.postMessage
);

export const ticketRoutes = router;
