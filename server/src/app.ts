import path from 'node:path';
import cors, { CorsOptionsDelegate } from 'cors';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import helmet from 'helmet';
import './config/env.js';
import pool from './db.js';
import logger from './logger.js';
import adminRouter from './routes/admin.routes.js';
import authRouter from './routes/auth.routes.js';
import laptopRouter from './routes/laptop.routes.js';
import orderRouter from './routes/order.routes.js';
import productRouter from './routes/product.routes.js';
import telegramRouter from './routes/telegram.routes.js';
import userRouter from './routes/user.routes.js';
import { issueCsrfTokenHandler, csrfProtection } from './middlewares/csrfMiddleware.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { attachRequestUser } from './middlewares/authMiddleware.js';
import { contentTypeGuard } from './middlewares/contentTypeGuard.js';
import { notFoundHandler } from './middlewares/notFoundHandler.js';
import { apiRateLimiter } from './middlewares/rateLimitMiddleware.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { responseSanitizer } from './middlewares/responseSanitizer.js';
import { getHealthReport } from './services/health.service.js';
import { registerStaticAssets } from './static.js';
import { logSecurityEvent } from './utils/securityLogger.js';

const parseTrustProxy = (value: string | undefined): boolean | number | string => {
  const normalized = value?.trim();
  if (!normalized) {
    return false;
  }
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  const numeric = Number.parseInt(normalized, 10);
  return Number.isFinite(numeric) ? numeric : normalized;
};

const resolveSecureCookie = (value: string | undefined, isProduction: boolean): boolean => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === 'auto') {
    return isProduction;
  }

  return normalized === 'true';
};

/** Builds and configures the Express application instance. */
export const createApp = (): Express => {
  const app = express();
  app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));
  const sessionCookieName = process.env.SESSION_COOKIE_NAME?.trim() || 'laptop_store.sid';
  const sessionSecret = process.env.SESSION_SECRET?.trim() || 'dev-insecure-session-secret-change-me';
  const sessionTtlMs = Number.parseInt(process.env.SESSION_TTL_MS ?? '604800000', 10);
  const cookieSameSite = (process.env.COOKIE_SAME_SITE?.trim() || 'lax') as 'lax' | 'strict' | 'none';
  const PgSessionStore = connectPgSimple(session);
  const isProduction = process.env.NODE_ENV === 'production';
  const secureCookie = resolveSecureCookie(process.env.COOKIE_SECURE, isProduction);
  const bodyLimit = process.env.BODY_LIMIT?.trim() || '100kb';
  const uploadsDir = path.resolve(process.env.UPLOADS_DIR?.trim() || 'uploads');

  const defaultOrigins = ['http://127.0.0.1:5000', 'http://localhost:5000'];
  const configuredOrigins = [
    process.env.ALLOWED_ORIGINS,
    process.env.CORS_ORIGIN,
    process.env.CLIENT_URL,
  ]
    .flatMap((value) => (value ?? '').split(','))
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = Array.from(new Set(configuredOrigins.length > 0 ? configuredOrigins : defaultOrigins));
  const baseAllowedHeaders = ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Accept'];

  const corsOptionsDelegate: CorsOptionsDelegate = (req, callback) => {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    if (!origin) {
      callback(null, { origin: false, credentials: true });
      return;
    }

    if (allowedOrigins.includes(origin)) {
      const rawRequestHeaders = req.headers['access-control-request-headers'];
      const requestHeadersValue = Array.isArray(rawRequestHeaders) ? rawRequestHeaders.join(',') : rawRequestHeaders;
      const dynamicHeaders =
        typeof requestHeadersValue === 'string'
          ? requestHeadersValue
              .split(',')
              .map((header) => header.trim())
              .filter(Boolean)
          : [];
      const allowedHeaders = Array.from(new Set([...baseAllowedHeaders, ...dynamicHeaders]));

      callback(null, {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders,
      });
      return;
    }

    logSecurityEvent({
      event: 'cors_blocked',
      severity: 'warn',
      reason: 'origin_not_allowed',
      metadata: { origin },
    });
    callback(new Error('Not allowed by CORS'));
  };

  app.use(
    helmet({
      hsts: isProduction
        ? {
            maxAge: 15552000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
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
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Credentials', 'true');
    }
    next();
  });
  app.use(cors(corsOptionsDelegate));
  app.use(compression());
  app.use(contentTypeGuard);
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: false, limit: bodyLimit }));
  app.use(cookieParser());
  app.use(
    session({
      name: sessionCookieName,
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: new PgSessionStore({
        pool,
        tableName: 'user_sessions',
        createTableIfMissing: true,
      }),
      proxy: isProduction,
      cookie: {
        httpOnly: true,
        secure: secureCookie,
        sameSite: cookieSameSite,
        maxAge: Number.isFinite(sessionTtlMs) ? sessionTtlMs : 604800000,
      },
    }),
  );
  app.use(requestLogger);
  app.use(responseSanitizer);
  app.use(apiRateLimiter);
  app.use(attachRequestUser);

  app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }));

  app.get('/api/health', async (_req, res) => {
    const report = await getHealthReport();
    res.status(report.status === 'ok' ? 200 : 503).json(report);
  });
  app.get('/health', (_req, res) => {
    res.redirect('/api/health');
  });
  app.get('/api/csrf-token', issueCsrfTokenHandler);

  app.use(csrfProtection);

  app.use('/api/auth', authRouter);
  app.use('/api/products', productRouter);
  app.use('/api/laptops', laptopRouter);
  app.use('/api/orders', orderRouter);
  app.use('/api/users', userRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/telegram', telegramRouter);

  if (isProduction) {
    registerStaticAssets(app);
  } else {
    logger.debug({ scope: 'static' }, 'Static asset registration skipped outside production');
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
