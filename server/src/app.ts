import cors, { CorsOptions } from 'cors';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import './config/env.js';
import laptopRouter from './routes/laptop.routes.js';
import ordersRouter from './routes/orders.routes.js';
import telegramRouter from './routes/telegram.routes.js';
import { issueCsrfTokenHandler, csrfProtection } from './middlewares/csrfMiddleware.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { attachRequestUser } from './middlewares/authMiddleware.js';
import { contentTypeGuard } from './middlewares/contentTypeGuard.js';
import { notFoundHandler } from './middlewares/notFoundHandler.js';
import { apiRateLimiter } from './middlewares/rateLimitMiddleware.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { responseSanitizer } from './middlewares/responseSanitizer.js';
import { logSecurityEvent } from './utils/securityLogger.js';

/** Builds and configures the Express application instance. */
export const createApp = (): Express => {
  const app = express();
  app.set('trust proxy', 1);

  const allowedOrigins = new Set(
    ['http://localhost:5173', ...(process.env.CLIENT_URL ?? '').split(',')]
      .map((origin) => origin.trim())
      .filter(Boolean),
  );

  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      logSecurityEvent({
        event: 'cors_blocked',
        severity: 'warn',
        reason: 'origin_not_allowed',
        metadata: { origin },
      });
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-User-Id', 'X-User-Role', 'X-User-Email'],
  };

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    }),
  );
  app.use(cors(corsOptions));
  app.use(contentTypeGuard);
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());
  app.use(requestLogger);
  app.use(responseSanitizer);
  app.use(apiRateLimiter);
  app.use(attachRequestUser);

  app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, status: 'ok' });
  });
  app.get('/api/csrf-token', issueCsrfTokenHandler);

  app.use(csrfProtection);

  app.use('/api/laptops', laptopRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/telegram', telegramRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
