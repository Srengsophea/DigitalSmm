import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  validateBody,
  registerSchema,
  loginSchema,
  sendSignupOtpSchema,
  verifySignupOtpSchema,
  resendOtpSchema,
} from '../middleware/validator';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Email OTP Signup Flow
router.post('/send-otp', authLimiter, validateBody(sendSignupOtpSchema), AuthController.sendSignupOtp);
router.post('/verify-otp', authLimiter, validateBody(verifySignupOtpSchema), AuthController.verifySignupOtp);
router.post('/resend-otp', authLimiter, validateBody(resendOtpSchema), AuthController.resendSignupOtp);

// Standard / Backward-Compatible Auth Routes
router.post('/register', authLimiter, validateBody(registerSchema), AuthController.register);
router.post('/login', authLimiter, validateBody(loginSchema), AuthController.login);
router.post('/google', authLimiter, AuthController.googleAuth);
router.get('/profile', authenticate, AuthController.getProfile);
router.post('/change-email', authenticate, AuthController.changeEmail);
router.post('/change-password', authenticate, AuthController.changePassword);
router.post('/toggle-2fa', authenticate, AuthController.toggle2FA);
router.post('/update-timezone', authenticate, AuthController.updateTimezone);
router.post('/api-key/regenerate', authenticate, AuthController.regenerateApiKey);

export default router;
