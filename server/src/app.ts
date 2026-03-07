import 'dotenv/config';
import cors, { CorsOptions } from 'cors';
import express, { Express } from 'express';
import laptopRouter from './routes/laptop.routes.js';
import ordersRouter from './routes/orders.routes.js';
import telegramRouter from './routes/telegram.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { attachRequestUser } from './middlewares/authMiddleware.js';
import { notFoundHandler } from './middlewares/notFoundHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';

/** Builds and configures the Express application instance. */
export const createApp = (): Express => {
  const app = express();

  const allowedOrigins = new Set(
    ['http://localhost:5173', ...(process.env.CLIENT_URL ?? '').split(',')]
      .map((origin) => origin.trim())
      .filter(Boolean),admin@laptop-store.local 
  );

  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  };

  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(requestLogger);
  app.use(attachRequestUser);

  app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, status: 'ok' });
  });

  app.use('/api/laptops', laptopRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/telegram', telegramRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
