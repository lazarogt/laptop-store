import logger from '../logger.js';

interface SecurityLogEvent {
  event: string;
  severity?: 'info' | 'warn' | 'error';
  ip?: string;
  path?: string;
  method?: string;
  reason?: string;
  userId?: number;
  metadata?: Record<string, unknown>;
}

/** Writes structured security logs without sensitive payloads. */
export const logSecurityEvent = (payload: SecurityLogEvent): void => {
  const entry = {
    scope: 'security',
    at: new Date().toISOString(),
    severity: payload.severity ?? 'warn',
    ...payload,
  };

  if (entry.severity === 'error') {
    logger.error(entry);
    return;
  }

  logger.warn(entry);
};
