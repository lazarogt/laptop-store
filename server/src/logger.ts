import pino from 'pino';

const level = process.env.LOG_LEVEL?.trim() || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

/** Shared structured logger for API/runtime concerns. */
export const logger = pino({
  level,
  base: {
    service: 'laptop-store-api',
    env: process.env.NODE_ENV ?? 'development',
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.passwordHash',
      'req.body.password_hash',
      'err.stack',
      '*.password',
      '*.token',
      '*.secret',
      '*.smtp_pass',
      '*.db_password',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
