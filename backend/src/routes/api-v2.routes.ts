import { Router } from 'express';
import { ApiV2Controller } from '../controllers/api-v2.controller';

const router = Router();

// Standard SMM API v2 handles both POST and GET
router.post('/', ApiV2Controller.handleApiV2);
router.get('/', ApiV2Controller.handleApiV2);

export default router;
