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
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../middleware/validator';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter';

const router = Router();

// Email OTP Signup Flow (Protected by strict anti-flooding otpLimiter)
router.post('/send-otp', otpLimiter, validateBody(sendSignupOtpSchema), AuthController.sendSignupOtp);
router.post('/verify-otp', authLimiter, validateBody(verifySignupOtpSchema), AuthController.verifySignupOtp);
router.post('/resend-otp', otpLimiter, validateBody(resendOtpSchema), AuthController.resendSignupOtp);

// Password Recovery Flow
router.post('/forgot-password', otpLimiter, validateBody(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', authLimiter, validateBody(resetPasswordSchema), AuthController.resetPassword);

// Standard / Backward-Compatible Auth Routes
router.post('/register', authLimiter, validateBody(registerSchema), AuthController.register);
router.post('/login', authLimiter, validateBody(loginSchema), AuthController.login);
router.post('/google', authLimiter, AuthController.googleAuth);
router.get('/profile', authenticate, AuthController.getProfile);

// Multi-Step Secure Email Change
router.post('/email/request-change', authenticate, otpLimiter, AuthController.requestEmailChange);
router.post('/email/verify-old', authenticate, authLimiter, AuthController.verifyOldEmailChange);
router.post('/email/verify-new', authenticate, authLimiter, AuthController.verifyNewEmailChange);

// Password & Settings
router.post('/avatar', authenticate, AuthController.updateAvatar);
router.post('/change-password', authenticate, authLimiter, AuthController.changePassword);
router.post('/update-timezone', authenticate, AuthController.updateTimezone);
router.post('/api-key/regenerate', authenticate, AuthController.regenerateApiKey);

// RFC 6238 TOTP Two-Factor Authentication (Anti-Brute Force on 6-digit codes)
router.post('/2fa/setup', authenticate, AuthController.setup2FA);
router.post('/2fa/verify-and-enable', authenticate, authLimiter, AuthController.verifyAndEnable2FA);
router.post('/2fa/disable', authenticate, authLimiter, AuthController.disable2FA);

export default router;
