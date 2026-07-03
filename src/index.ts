import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';
import { logger } from './utils/logger';
import { API_PREFIX } from './config/constants';

// Import routes
import authRoutes from './routes/auth.routes';
import mediaRoutes from './routes/media.routes';
import watchlistRoutes from './routes/watchlist.routes';
import providersRoutes from './routes/providers.routes';
import geminiRoutes from './routes/gemini.routes';

// Initialize Express app
const app = express();

// ============================================
// Global Middleware
// ============================================

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: env.corsOrigin === '*' ? '*' : env.corsOrigin.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// General rate limiting
app.use(generalLimiter);

// Request logging
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// ============================================
// Health Check
// ============================================
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.nodeEnv,
    },
  });
});

// ============================================
// Routes
// ============================================
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/media`, mediaRoutes);
app.use(`${API_PREFIX}/watchlists`, watchlistRoutes);
app.use(`${API_PREFIX}/providers`, providersRoutes);
app.use(`${API_PREFIX}/gemini`, geminiRoutes);

// 404 handler for unknown routes
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist',
    },
  });
});

// ============================================
// Global Error Handler (must be last)
// ============================================
app.use(errorHandler);

// ============================================
// Start Server
// ============================================
app.listen(env.port, () => {
  logger.info(`WatchList Backend running on port ${env.port}`);
  logger.info(`Environment: ${env.nodeEnv}`);
  logger.info(`API Base: http://localhost:${env.port}${API_PREFIX}`);
  logger.info(`Health: http://localhost:${env.port}/api/health`);
});

export default app;
