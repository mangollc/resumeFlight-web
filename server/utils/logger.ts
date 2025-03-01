
/**
 * Enhanced logging utility for the server
 */

import { Request, Response, NextFunction } from 'express';

// Log levels
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

// Environment-aware logging
const isDev = process.env.NODE_ENV === 'development';

// Log with timestamp and level
export const logger = {
  debug: (message: string, data?: any) => {
    if (isDev) {
      console.log(`[${new Date().toISOString()}] [DEBUG] ${message}`);
    }
  },
  info: (message: string, data?: any) => {
    if (isDev || process.env.LOG_LEVEL === 'info') {
      console.log(`[${new Date().toISOString()}] [INFO] ${message}`);
    }
  },
  warn: (message: string, data?: any) => {
    console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, data ? '' : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`);
    if (error && error.stack) {
      console.error(error.stack);
    }
  }
};

// Express middleware for request logging
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Only log API requests with minimal info
  if (req.originalUrl.startsWith('/api') && process.env.NODE_ENV === 'development') {
    logger.debug(`${req.method} ${req.originalUrl}`);
  }
  
  // Log response on finish - only for non-static content
  res.on('finish', () => {
    // Skip logging for static assets, health checks, and successful standard requests
    const isStatic = req.originalUrl.includes('.') && !req.originalUrl.startsWith('/api');
    const isHealthCheck = req.originalUrl === '/api/health';
    const isSuccessful = res.statusCode >= 200 && res.statusCode < 300;
    
    if (isStatic || (isHealthCheck && isSuccessful)) {
      return;
    }
    
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
    
    if (res.statusCode >= 500) {
      logger.error(message);
    } else if (res.statusCode >= 400) {
      logger.warn(message);
    } else {
      logger.info(message);
    }
  });
  
  next();
};
