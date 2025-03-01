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
  // Skip logging for static assets and API requests that don't need detailed logging
  if (req.path.match(/\.(js|css|map|jpg|png|svg|ico|ttf|woff|woff2)$/) || 
      req.path.match(/^\/src\//) ||
      req.path.match(/^\/_/) ||
      req.path === '/api/user') {
    return next();
  }

  // Log only essential information for API requests
  if (req.path.startsWith('/api/')) {
    // Log the request details without headers
    console.log(`[${new Date().toISOString()}] [INFO] ${req.method} ${req.path}`);

    // Log the response status when the response is sent
    const originalEnd = res.end;
    res.end = function (chunk?: any, encoding?: any, callback?: any) {
      console.log(`[${new Date().toISOString()}] [INFO] ${req.method} ${req.path} ${res.statusCode}`);
      return originalEnd.call(this, chunk, encoding, callback);
    };
  } else {
    // For non-API routes, just log the path
    console.log(`[${new Date().toISOString()}] [INFO] ${req.method} ${req.path}`);
  }

  // Track request start time
  req.startTime = Date.now();
  next();
};