import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { validateBody, updateServiceMarkupSchema, updateIndividualServiceSchema, updateProviderSettingsSchema, bulkStatusSchema } from '../middleware/validator';

const router = Router();

// Protect all admin routes
router.use(authenticate, requireAdmin);

router.get('/stats', AdminController.getStats);
router.get('/users', AdminController.getAllUsers);
router.post('/users/balance', AdminController.adjustUserBalance);
router.post('/users/status', AdminController.toggleUserStatus);
router.get('/orders', AdminController.getAllOrders);
router.put('/services/:id', validateBody(updateIndividualServiceSchema), AdminController.updateService);
router.post('/services/markup', validateBody(updateServiceMarkupSchema), AdminController.batchUpdateMarkup);
router.post('/services/bulk-status', validateBody(bulkStatusSchema), AdminController.bulkUpdateServiceStatus);
router.get('/settings', AdminController.getSettings);
router.post('/settings', validateBody(updateProviderSettingsSchema), AdminController.updateSettings);
router.get('/audit-logs', AdminController.getAuditLogs);

export default router;
