import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

// Constants
const ONE_HOUR = 3600000;
const ONE_DAY = ONE_HOUR * 24;

// Create session store with enhanced error handling
export const sessionStore = new PostgresSessionStore({
  pool,
  tableName: 'session',
  createTableIfMissing: true,
  pruneSessionInterval: ONE_HOUR, // Prune expired sessions every hour
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
const MAX_32_BIT_INT = 2147483647;
const SAFE_ONE_DAY = Math.min(ONE_DAY, MAX_32_BIT_INT);

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