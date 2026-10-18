"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const env_1 = require("./config/env");
const rateLimiter_1 = require("./middleware/rateLimiter");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const services_routes_1 = __importDefault(require("./routes/services.routes"));
const orders_routes_1 = __importDefault(require("./routes/orders.routes"));
const wallet_routes_1 = __importDefault(require("./routes/wallet.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const api_v2_routes_1 = __importDefault(require("./routes/api-v2.routes"));
const tickets_routes_1 = __importDefault(require("./routes/tickets.routes"));
const db_service_1 = require("./services/db.service");
const app = (0, express_1.default)();
// Security HTTP headers (XSS filter, Clickjacking denial, NoSniff, HSTS)
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true },
    ieNoOpen: true,
    noSniff: true,
    xssFilter: true,
}));
// Restrict browser hardware access and enforce strict referrer isolation
app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});
// Cross-Origin Resource Sharing with strict domain whitelist
const allowedOrigins = Array.isArray(env_1.ENV.CORS_ORIGIN)
    ? env_1.ENV.CORS_ORIGIN.map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://localhost:5000'];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`Blocked by CORS policy: Origin ${origin} is not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    maxAge: 86400, // Cache preflight for 24h
}));
// Body parsing with safe size limit (500kb to mitigate memory exhaustion DoS)
app.use(express_1.default.json({ limit: '500kb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '500kb' }));
// Apply rate limiting across general API
app.use('/api', rateLimiter_1.apiLimiter);
// Register API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/services', services_routes_1.default);
app.use('/api/orders', orders_routes_1.default);
app.use('/api/wallet', wallet_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/v2', api_v2_routes_1.default);
app.use('/api/tickets', tickets_routes_1.default);
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'DigitalSMM Secure API',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
// 404 Handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
});
// Centralized Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: env_1.ENV.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Unknown error',
    });
});
// Initialize database
db_service_1.DatabaseService.getInstance();
const server = app.listen(env_1.ENV.PORT, () => {
    console.log('====================================================');
    console.log(`🚀 DigitalSMM Backend running on port ${env_1.ENV.PORT}`);
    console.log(`🔒 Security: AES-256-GCM Encryption, BCrypt & Strict CORS Active`);
    console.log(`🌐 Provider: SMMFollows API Connected`);
    console.log(`🔑 Reseller API v2 Ready at: http://localhost:${env_1.ENV.PORT}/api/v2`);
    console.log(`👤 Admin: ${env_1.ENV.ADMIN_EMAIL} (Password protected in secure env)`);
    console.log('====================================================');
});
// Anti-Slowloris / HTTP socket timeout protection
server.setTimeout(30000);
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Gracefully stopping server...');
    server.close(() => {
        process.exit(0);
    });
});
exports.default = app;
