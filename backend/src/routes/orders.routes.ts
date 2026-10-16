import { Router } from 'express';
import { OrdersController } from '../controllers/orders.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody, createOrderSchema } from '../middleware/validator';
import { orderLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/', authenticate, orderLimiter, validateBody(createOrderSchema), OrdersController.createOrder);
router.post('/mass', authenticate, orderLimiter, OrdersController.createMassOrder);
router.get('/my-orders', authenticate, OrdersController.getMyOrders);
router.get('/:id/status', authenticate, OrdersController.checkLiveStatus);

export default router;
