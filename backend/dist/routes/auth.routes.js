"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validator_1 = require("../middleware/validator");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
// Email OTP Signup Flow
router.post('/send-otp', rateLimiter_1.authLimiter, (0, validator_1.validateBody)(validator_1.sendSignupOtpSchema), auth_controller_1.AuthController.sendSignupOtp);
router.post('/verify-otp', rateLimiter_1.authLimiter, (0, validator_1.validateBody)(validator_1.verifySignupOtpSchema), auth_controller_1.AuthController.verifySignupOtp);
router.post('/resend-otp', rateLimiter_1.authLimiter, (0, validator_1.validateBody)(validator_1.resendOtpSchema), auth_controller_1.AuthController.resendSignupOtp);
// Standard / Backward-Compatible Auth Routes
router.post('/register', rateLimiter_1.authLimiter, (0, validator_1.validateBody)(validator_1.registerSchema), auth_controller_1.AuthController.register);
router.post('/login', rateLimiter_1.authLimiter, (0, validator_1.validateBody)(validator_1.loginSchema), auth_controller_1.AuthController.login);
router.post('/google', rateLimiter_1.authLimiter, auth_controller_1.AuthController.googleAuth);
router.get('/profile', auth_middleware_1.authenticate, auth_controller_1.AuthController.getProfile);
router.post('/change-email', auth_middleware_1.authenticate, auth_controller_1.AuthController.changeEmail);
router.post('/change-password', auth_middleware_1.authenticate, auth_controller_1.AuthController.changePassword);
router.post('/toggle-2fa', auth_middleware_1.authenticate, auth_controller_1.AuthController.toggle2FA);
router.post('/update-timezone', auth_middleware_1.authenticate, auth_controller_1.AuthController.updateTimezone);
router.post('/api-key/regenerate', auth_middleware_1.authenticate, auth_controller_1.AuthController.regenerateApiKey);
exports.default = router;
