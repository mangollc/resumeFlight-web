
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

// Log with timestamp and level
export const logger = {
  debug: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [DEBUG] ${message}`, data ? data : '');
  },
  info: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [INFO] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, data ? data : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, error ? error : '');
    if (error && error.stack) {
      console.error(error.stack);
    }
  }
};

// Express middleware for request logging
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log request details
  logger.info(`${req.method} ${req.originalUrl}`, {
    headers: req.headers,
    query: req.query,
    body: req.body
  });
  
  // Log response on finish
  res.on('finish', () => {
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
