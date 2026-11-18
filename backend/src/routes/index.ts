import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { ticketRoutes } from './ticket.routes.js';
import { notificationRoutes } from './notification.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tickets', ticketRoutes);
router.use('/notifications', notificationRoutes);

export const apiRoutes = router;
