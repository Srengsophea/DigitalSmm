"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketLimiter = exports.orderLimiter = exports.otpLimiter = exports.authLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const proxyValidateConfig = {
    xForwardedForHeader: false,
    default: true,
};
// Global API rate limit: 120 requests per minute
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    validate: proxyValidateConfig,
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again in a minute.',
    },
});
// Auth endpoints rate limit: 30 attempts per 15 minutes (Anti-Brute Force)
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    validate: proxyValidateConfig,
    message: {
        success: false,
        error: 'Too many authentication attempts from this IP address. Please wait 15 minutes.',
    },
});
// Strict Email OTP Dispatch Limiter: max 5 OTP requests per 15 minutes (Anti-Email Flooding / SMTP exhaustion)
exports.otpLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    validate: proxyValidateConfig,
    message: {
        success: false,
        error: 'Verification code request limit reached. Please wait 15 minutes before requesting more codes.',
    },
});
// Order placement rate limit: 30 orders per minute
exports.orderLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    validate: proxyValidateConfig,
    message: {
        success: false,
        error: 'Order rate limit exceeded. Please wait a moment before creating more orders.',
    },
});
// Support ticket creation rate limit: 10 tickets per 15 minutes (Anti-Spam / Flooding)
exports.ticketLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    validate: proxyValidateConfig,
    message: {
        success: false,
        error: 'Ticket submission limit reached. Please wait a few minutes before submitting more support tickets.',
    },
});
