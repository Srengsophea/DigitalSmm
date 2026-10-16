import { Router } from 'express';
import { TicketsController } from '../controllers/tickets.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/my-tickets', authenticate, TicketsController.getMyTickets);
router.post('/', authenticate, TicketsController.createTicket);
router.get('/all', authenticate, TicketsController.getAllTickets);

export default router;
