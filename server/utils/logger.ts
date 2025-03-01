
import { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';

// Log levels with color coding
const LOG_LEVELS = {
  INFO: {
    label: 'INFO',
    color: chalk.blue,
  },
  SUCCESS: {
    label: 'SUCCESS',
    color: chalk.green,
  },
  WARN: {
    label: 'WARN',
    color: chalk.yellow,
  },
  ERROR: {
    label: 'ERROR',
    color: chalk.red,
  },
  DEBUG: {
    label: 'DEBUG',
    color: chalk.magenta,
  },
};

// Format timestamp for logs
const getTimestamp = () => {
  return new Date().toISOString();
};

// Format log entry
const formatLogEntry = (level, message, meta = {}) => {
  const { label, color } = LOG_LEVELS[level];
  const timestamp = getTimestamp();
  
  let metaString = '';
  if (Object.keys(meta).length > 0) {
    try {
      metaString = JSON.stringify(meta, null, process.env.NODE_ENV === 'development' ? 2 : 0);
    } catch (err) {
      metaString = '[Circular or Non-Serializable Data]';
    }
  }
  
  return `${chalk.gray(timestamp)} ${color(label.padEnd(7))} ${message}${metaString ? ` ${chalk.gray(metaString)}` : ''}`;
};

// Avoid logging massive objects or circular references
const sanitizeObject = (obj, maxDepth = 3, currentDepth = 0) => {
  if (currentDepth >= maxDepth) return '[Object depth limit exceeded]';
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Skip large string values or buffer data
      if (typeof obj[key] === 'string' && obj[key].length > 500) {
        result[key] = `[String: ${obj[key].substring(0, 50)}... (${obj[key].length} chars)]`;
      } else if (obj[key] instanceof Buffer) {
        result[key] = `[Buffer: ${obj[key].length} bytes]`;
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        result[key] = sanitizeObject(obj[key], maxDepth, currentDepth + 1);
      } else {
        result[key] = obj[key];
      }
    }
  }
  
  return result;
};

// The logger object that will be exported
export const logger = {
  info: (message, meta = {}) => {
    console.log(formatLogEntry('INFO', message, sanitizeObject(meta)));
  },
  
  success: (message, meta = {}) => {
    console.log(formatLogEntry('SUCCESS', message, sanitizeObject(meta)));
  },
  
  warn: (message, meta = {}) => {
    console.warn(formatLogEntry('WARN', message, sanitizeObject(meta)));
  },
  
  error: (message, error = {}, meta = {}) => {
    const errorObj = error instanceof Error ? {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      ...meta
    } : {...error, ...meta};
    
    console.error(formatLogEntry('ERROR', message, sanitizeObject(errorObj)));
  },
  
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatLogEntry('DEBUG', message, sanitizeObject(meta)));
    }
  },
  
  // Special method for API errors with context
  apiError: (context, error, extra = {}) => {
    const errorDetails = {
      message: error.message || 'Unknown error',
      code: error.code,
      status: error.status || error.statusCode,
      ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
      ...extra
    };
    
    console.error(formatLogEntry('ERROR', `[${context}] ${errorDetails.message}`, sanitizeObject(errorDetails)));
    return errorDetails;
  }
};

// Express middleware for request logging
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Create a patched end method to log the response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, callback?: any): any {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    const statusColor = statusCode >= 500 
      ? chalk.red
      : statusCode >= 400 
        ? chalk.yellow
        : statusCode >= 300 
          ? chalk.cyan
          : chalk.green;
            
    const logLevel = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
    const method = chalk.bold(req.method);
    const url = req.originalUrl || req.url;
    const userAgent = req.get('User-Agent') || '-';
    const referrer = req.get('Referrer') || '-';
    const userIP = req.ip || req.connection.remoteAddress;
    
    // Only include user-agent and referrer in dev mode
    const meta = process.env.NODE_ENV === 'development' 
      ? { responseTime, ip: userIP, userAgent, referrer }
      : { responseTime, ip: userIP };
      
    console.log(formatLogEntry(
      logLevel, 
      `${method} ${url} ${statusColor(statusCode)}`, 
      meta
    ));
    
    // Restore the original end
    res.end = originalEnd;
    return res.end(chunk, encoding, callback);
  };
  
  next();
};

// Capture and standardize uncaught exceptions
export const setupGlobalErrorLogging = () => {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', error);
    // Give logger time to write before exiting
    setTimeout(() => process.exit(1), 500);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', 
      reason instanceof Error ? reason : new Error(String(reason)));
    // Do not exit for unhandled promises, as they may be non-critical
  });
};
