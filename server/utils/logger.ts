import chalk from 'chalk';

import { Request, Response, NextFunction } from 'express';

export const logger = {
  info: (message: string) => {
    console.log(chalk.blue(`[INFO] ${message}`));
  },
  error: (message: string, error?: any) => {
    console.error(chalk.red(`[ERROR] ${message}`), error || '');
  },
  success: (message: string) => {
    console.log(chalk.green(`[SUCCESS] ${message}`));
  },
  warning: (message: string) => {
    console.log(chalk.yellow(`[WARNING] ${message}`));
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
    const userIP = req.ip || req.connection.remoteAddress;

    const message = `${method} ${url} ${statusColor(statusCode)}`;

    if(logLevel === 'ERROR'){
        logger.error(message, { responseTime, ip: userIP });
    } else if (logLevel === 'WARN'){
        logger.warning(message, { responseTime, ip: userIP });
    } else {
        logger.info(message, { responseTime, ip: userIP });
    }


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