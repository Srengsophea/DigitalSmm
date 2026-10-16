import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody, registerSchema, loginSchema } from '../middleware/validator';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, validateBody(registerSchema), AuthController.register);
router.post('/login', authLimiter, validateBody(loginSchema), AuthController.login);
router.post('/google', authLimiter, AuthController.googleAuth);
router.get('/profile', authenticate, AuthController.getProfile);
router.post('/api-key/regenerate', authenticate, AuthController.regenerateApiKey);

export default router;
