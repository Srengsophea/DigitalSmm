import rateLimit from 'express-rate-limit';

// Global API rate limit: 120 requests per minute
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again in a minute.',
  },
});

// Auth endpoints rate limit: 30 attempts per 15 minutes (Anti-Brute Force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts from this IP address. Please wait 15 minutes.',
  },
});

// Strict Email OTP Dispatch Limiter: max 5 OTP requests per 15 minutes (Anti-Email Flooding / SMTP exhaustion)
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Verification code request limit reached. Please wait 15 minutes before requesting more codes.',
  },
});

// Order placement rate limit: 30 orders per minute
export const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Order rate limit exceeded. Please wait a moment before creating more orders.',
  },
});
