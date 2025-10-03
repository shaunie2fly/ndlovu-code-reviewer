import winston from 'winston';
import path from 'path';
import fs from 'fs';

let logger: winston.Logger | null = null;

/**
 * Creates and configures the winston logger
 * @param enabled - Whether logging is enabled
 * @returns winston.Logger instance or null if disabled
 */
export function createLogger(enabled: boolean): winston.Logger | null {
  if (!enabled) {
    return null;
  }

  // Create logs directory if it doesn't exist
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Define log format
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  // Create logger instance
  logger = winston.createLogger({
    level: 'info',
    format: logFormat,
    transports: [
      // Write all logs to combined.log
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      // Write error logs to error.log
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 3,
      }),
    ],
  });

  // If not in production, also log to console
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }));
  }

  return logger;
}

/**
 * Gets the logger instance
 * @returns winston.Logger or null if not initialized
 */
export function getLogger(): winston.Logger | null {
  return logger;
}

/**
 * Log info message
 * @param message - Message to log
 * @param meta - Additional metadata
 */
export function logInfo(message: string, meta?: any): void {
  if (logger) {
    logger.info(message, meta);
  }
}

/**
 * Log error message
 * @param message - Message to log
 * @param error - Error object or additional metadata
 */
export function logError(message: string, error?: any): void {
  if (logger) {
    logger.error(message, error);
  }
}

/**
 * Log warning message
 * @param message - Message to log
 * @param meta - Additional metadata
 */
export function logWarning(message: string, meta?: any): void {
  if (logger) {
    logger.warn(message, meta);
  }
}

/**
 * Log debug message
 * @param message - Message to log
 * @param meta - Additional metadata
 */
export function logDebug(message: string, meta?: any): void {
  if (logger) {
    logger.debug(message, meta);
  }
}