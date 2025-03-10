import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

// Set reasonable timeout values
const SESSION_TIMEOUT = 3600000; // 1 hour
const STORE_CLEANUP_PERIOD = 900000; // 15 minutes

// Create session store with enhanced error handling
export const sessionStore = new PostgresSessionStore({
  pool,
  tableName: 'session',
  createTableIfMissing: true,
  pruneSessionInterval: STORE_CLEANUP_PERIOD,
  ttl: SESSION_TIMEOUT,
  disableTouch: false,
  errorLog: (err: Error) => {
    console.error('[Session Store Error]:', err);
  }
});

// Add event handlers
sessionStore.on('connect', () => {
  console.log('[Session Store] Connected successfully');
});

sessionStore.on('error', (error: Error) => {
  console.error('[Session Store] Error:', error);
});

// Export session middleware configuration
export const sessionConfig = session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: STORE_CLEANUP_PERIOD
  },
  name: 'sid',
  rolling: true
});

// Cleanup function
export const cleanupSessionStore = async () => {
  return new Promise<void>((resolve, reject) => {
    try {
      sessionStore.close();
      console.log('[Session Store] Cleaned up successfully');
      resolve();
    } catch (error) {
      console.error('[Session Store] Error during cleanup:', error);
      reject(error);
    }
  });
};