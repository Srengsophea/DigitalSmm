import { Router } from 'express';
import { ServicesController } from '../controllers/services.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/', ServicesController.getServices);
router.get('/:id', ServicesController.getServiceById);
router.post('/sync', authenticate, requireAdmin, ServicesController.syncServices);

export default router;
