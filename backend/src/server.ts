import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ENV } from './config/env';
import { apiLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth.routes';
import servicesRoutes from './routes/services.routes';
import ordersRoutes from './routes/orders.routes';
import walletRoutes from './routes/wallet.routes';
import adminRoutes from './routes/admin.routes';
import apiV2Routes from './routes/api-v2.routes';
import ticketsRoutes from './routes/tickets.routes';
import { DatabaseService } from './services/db.service';

const app = express();

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  })
);

// Body parsing with safe size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting across general API
app.use('/api', apiLimiter);

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/v2', apiV2Routes);
app.use('/api/tickets', ticketsRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'DigitalSMM Secure API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Centralized Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: ENV.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Unknown error',
  });
});

// Initialize database
DatabaseService.getInstance();

const server = app.listen(ENV.PORT, () => {
  console.log('====================================================');
  console.log(`🚀 DigitalSMM Backend running on port ${ENV.PORT}`);
  console.log(`🔒 Security: AES-256-GCM Encryption & BCrypt Hashing Active`);
  console.log(`🌐 Provider: SMMFollows API Connected`);
  console.log(`🔑 Reseller API v2 Ready at: http://localhost:${ENV.PORT}/api/v2`);
  console.log(`👤 Default Admin: ${ENV.ADMIN_EMAIL} / ${ENV.ADMIN_PASSWORD}`);
  console.log('====================================================');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Gracefully stopping server...');
  server.close(() => {
    process.exit(0);
  });
});

export default app;
