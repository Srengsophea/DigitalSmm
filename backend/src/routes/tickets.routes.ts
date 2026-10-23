import { Router } from 'express';
import { TicketsController } from '../controllers/tickets.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { ticketLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/my-tickets', authenticate, TicketsController.getMyTickets);
router.post('/', authenticate, ticketLimiter, TicketsController.createTicket);
router.get('/all', authenticate, requireAdmin, TicketsController.getAllTickets);

export default router;
