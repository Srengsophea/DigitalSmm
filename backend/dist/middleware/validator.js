"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProviderSettingsSchema = exports.updateIndividualServiceSchema = exports.bulkStatusSchema = exports.updateServiceMarkupSchema = exports.depositSchema = exports.createOrderSchema = exports.loginSchema = exports.registerSchema = exports.validateBody = void 0;
const zod_1 = require("zod");
const validateBody = (schema) => {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (err) {
            if (err instanceof zod_1.z.ZodError) {
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
exports.validateBody = validateBody;
exports.registerSchema = zod_1.z.object({
    username: zod_1.z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username cannot exceed 30 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: zod_1.z.string().email('Please provide a valid email address'),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password is too long'),
});
exports.loginSchema = zod_1.z.object({
    login: zod_1.z.string().min(1, 'Email or username is required'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.createOrderSchema = zod_1.z.object({
    serviceId: zod_1.z.string().min(1, 'Service ID is required'),
    link: zod_1.z.string().url('Target URL must be a valid link').or(zod_1.z.string().min(3, 'Target account/link is required')),
    quantity: zod_1.z.number().int().positive('Quantity must be a positive number'),
    runs: zod_1.z.number().int().positive().optional(),
    interval: zod_1.z.number().int().positive().optional(),
});
exports.depositSchema = zod_1.z.object({
    amount: zod_1.z.number().min(5, 'Minimum deposit is $5.00').max(10000, 'Maximum single deposit is $10,000.00'),
    method: zod_1.z.enum(['CRYPTO_USDT', 'CREDIT_CARD', 'PAYPAL', 'STRIPE', 'BANK_TRANSFER']).default('CRYPTO_USDT'),
});
exports.updateServiceMarkupSchema = zod_1.z.object({
    markupPercent: zod_1.z.number().min(0, 'Markup cannot be negative').max(1000, 'Markup cannot exceed 1000%').optional(),
    fixedIncrease: zod_1.z.number().min(0, 'Fixed increase cannot be negative').max(1000).optional(),
    platform: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    serviceIds: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.bulkStatusSchema = zod_1.z.object({
    serviceIds: zod_1.z.array(zod_1.z.string()).min(1, 'At least one service ID is required'),
    isActive: zod_1.z.boolean(),
});
exports.updateIndividualServiceSchema = zod_1.z.object({
    customRate: zod_1.z.number().min(0, 'Custom rate must be non-negative').optional(),
    markupPercent: zod_1.z.number().min(0, 'Markup percent must be non-negative').optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.updateProviderSettingsSchema = zod_1.z.object({
    apiKey: zod_1.z.string().min(10, 'Provider API key is invalid').optional(),
    apiUrl: zod_1.z.string().url('Invalid API URL').optional(),
    defaultMarkupPercent: zod_1.z.number().min(0).max(1000).optional(),
});
