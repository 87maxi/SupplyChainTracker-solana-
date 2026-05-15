/**
 * Centralized logging system with environment-aware levels.
 *
 * Usage:
 *   import { log } from '@/lib/logger';
 *   log.debug('Component mounted', { userId });
 *   log.info('Transaction submitted', { signature });
 *   log.warn('Cache stale', { key });
 *   log.error('Failed to connect', error);
 *
 * In production, only warn and error are output by default.
 * Set NEXT_PUBLIC_LOG_LEVEL=debug in environment to enable all levels.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): LogLevel {
  const envLevel = process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel | undefined;
  if (envLevel && envLevel in LEVEL_PRIORITY) {
    return envLevel;
  }
  // Production: only warn+; Development: all levels
  return process.env.NODE_ENV === 'production' ? 'warn' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[getMinLevel()];
}

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown> | unknown): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  if (meta && typeof meta === 'object') {
    return `${prefix} ${message} ${JSON.stringify(meta)}`;
  }
  return `${prefix} ${message}`;
}

const log = {
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', message, meta));
    }
  },

  info: (message: string, meta?: Record<string, unknown>) => {
    if (shouldLog('info')) {
      console.info(formatMessage('info', message, meta));
    }
  },

  warn: (message: string, meta?: Record<string, unknown>) => {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, meta));
    }
  },

  error: (message: string, error?: unknown) => {
    if (shouldLog('error')) {
      const meta = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error && typeof error === 'object'
          ? (error as Record<string, unknown>)
          : undefined;
      console.error(formatMessage('error', message, meta));
    }
  },
};

export { log, type LogLevel };
