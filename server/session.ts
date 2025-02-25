import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

// Constants
const MAX_32_BIT = Math.pow(2, 31) - 1;
const SAFE_ONE_DAY = Math.min(86400000, MAX_32_BIT);
const SESSION_TIMEOUT = Math.min(3600000, MAX_32_BIT); // 1 hour in milliseconds

// Create session store with enhanced error handling
export const sessionStore = new PostgresSessionStore({
  pool,
  tableName: 'session',
  createTableIfMissing: true,
  pruneSessionInterval: SAFE_ONE_DAY,
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
    maxAge: SAFE_ONE_DAY
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