interface LogMessage {
  message: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'success';
  timestamp: string;
  context?: any;
}

class Logger {
  private logToConsole(message: string, level: string, context?: any) {
    const timestamp = new Date().toISOString();
    const prefix = `[${level.toUpperCase()}] ${timestamp}`;

    if (context) {
      console.log(`${prefix} ${message}`, context);
    } else {
      console.log(`${prefix} ${message}`);
    }

    return {
      message,
      level: level as LogMessage['level'],
      timestamp,
      context
    };
  }

  info(message: string, context?: any) {
    return this.logToConsole(message, 'info', context);
  }

  warn(message: string, context?: any) {
    return this.logToConsole(message, 'warn', context);
  }

  error(message: string, context?: any) {
    return this.logToConsole(message, 'error', context);
  }

  debug(message: string, context?: any) {
    if (process.env.NODE_ENV !== 'production') {
      return this.logToConsole(message, 'debug', context);
    }
    return null;
  }

  success(message: string, context?: any) {
    return this.logToConsole(message, 'success', context);
  }

  // Add warning method to match usage in middleware
  warning(message: string, context?: any) {
    return this.warn(message, context);
  }
}

export const logger = new Logger();

// Middleware for logging HTTP requests
export const requestLogger = (req, res, next) => {
  const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const start = Date.now();

  // Save the original end method
  const originalEnd = res.end;

  // Override the end method
  res.end = function(chunk, encoding, callback) {
    const responseTime = Date.now() - start;
    let logLevel = 'INFO';

    if (res.statusCode >= 500) {
      logLevel = 'ERROR';
    } else if (res.statusCode >= 400) {
      logLevel = 'WARN';
    }

    const message = `${req.method} ${req.originalUrl || req.url} - ${res.statusCode} - ${responseTime}ms`;

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