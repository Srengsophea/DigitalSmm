import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      res.status(400).json({ success: false, error: 'Invalid request data' });
    }
  };
};

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Please provide a valid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password is too long'),
  otp: z.string().optional(),
});

export const sendSignupOtpSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Please provide a valid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password is too long'),
});

export const verifySignupOtpSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  otp: z.string().min(4, 'Verification code is required').max(10),
});

export const resendOtpSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
});

export const resetPasswordSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  otp: z.string().min(4, 'Verification code is required').max(10),
  newPassword: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password is too long'),
});

export const loginSchema = z.object({
  login: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
  twoFactorCode: z.string().optional(),
});

export const createOrderSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
  link: z.string().url('Target URL must be a valid link').or(z.string().min(3, 'Target account/link is required')),
  quantity: z.number().int().positive('Quantity must be a positive number'),
  runs: z.number().int().positive().optional(),
  interval: z.number().int().positive().optional(),
});

export const depositSchema = z.object({
  amount: z.number().min(5, 'Minimum deposit is $5.00').max(10000, 'Maximum single deposit is $10,000.00'),
  method: z.enum(['CRYPTO_USDT', 'CREDIT_CARD', 'PAYPAL', 'STRIPE', 'BANK_TRANSFER']).default('CRYPTO_USDT'),
});

export const updateServiceMarkupSchema = z.object({
  markupPercent: z.number().min(0, 'Markup cannot be negative').max(1000, 'Markup cannot exceed 1000%').optional(),
  fixedIncrease: z.number().min(0, 'Fixed increase cannot be negative').max(1000).optional(),
  platform: z.string().optional(),
  category: z.string().optional(),
  serviceIds: z.array(z.string()).optional(),
});

export const bulkStatusSchema = z.object({
  serviceIds: z.array(z.string()).min(1, 'At least one service ID is required'),
  isActive: z.boolean(),
});

export const updateIndividualServiceSchema = z.object({
  customRate: z.number().min(0, 'Custom rate must be non-negative').optional(),
  markupPercent: z.number().min(0, 'Markup percent must be non-negative').optional(),
  isActive: z.boolean().optional(),
});

export const updateProviderSettingsSchema = z.object({
  apiKey: z.string().min(10, 'Provider API key is invalid').optional(),
  apiUrl: z.string().url('Invalid API URL').optional(),
  defaultMarkupPercent: z.number().min(0).max(1000).optional(),
});
