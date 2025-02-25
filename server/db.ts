
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon database
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Constants for timeout and interval values (in milliseconds)
const MAX_32_BIT_INT = 2147483647; // Math.pow(2, 31) - 1
const DEFAULT_IDLE_TIMEOUT = 30000;
const DEFAULT_CONN_TIMEOUT = 5000;
const DEFAULT_QUERY_TIMEOUT = 30000;
const KEEPALIVE_INTERVAL = 60000;
const MAX_RETRY_INTERVAL = 300000;

// Ensure timeouts don't exceed 32-bit integer limit
const getSafeTimeout = (timeout: number): number => {
  if (typeof timeout !== 'number' || isNaN(timeout)) return DEFAULT_CONN_TIMEOUT;
  return Math.min(Math.max(0, timeout), MAX_32_BIT_INT);
};

// Initialize connection pool with safe timeout values
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: getSafeTimeout(DEFAULT_IDLE_TIMEOUT),
  connectionTimeoutMillis: getSafeTimeout(DEFAULT_CONN_TIMEOUT),
  statement_timeout: getSafeTimeout(DEFAULT_QUERY_TIMEOUT),
  query_timeout: getSafeTimeout(DEFAULT_QUERY_TIMEOUT),
  allowExitOnIdle: true
});

// Disable Node.js timeout warnings
process.env.NODE_NO_WARNINGS = '1';

// Initialize Drizzle with the pool
export const db = drizzle(pool, { schema });

let connectionCount = 0;

pool.on('connect', (client) => {
  connectionCount++;
  console.log(`Database connection ${connectionCount} established`);
  client.query("SET timezone='America/New_York';").catch(err => {
    console.error('Error setting timezone:', err);
  });
});

pool.on('error', (err) => {
  if (err.message.includes('timeout')) {
    console.warn('Connection timeout occurred - this is normal during idle periods');
    return;
  }
  console.error('Unexpected error on idle client:', err);
  setTimeout(() => {
    console.log('Attempting to reconnect...');
    checkDatabaseConnection();
  }, getSafeTimeout(5000));
});

export const checkDatabaseConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW() AT TIME ZONE \'America/New_York\' as now');
    console.log('Database connection verified:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
};

export const getCurrentESTTimestamp = async () => {
  try {
    const result = await pool.query('SELECT NOW() AT TIME ZONE \'America/New_York\' as now');
    return result.rows[0].now;
  } catch (error) {
    console.error('Error getting current timestamp:', error);
    throw error;
  }
};

// Safe interval wrapper function
const createSafeInterval = (fn: () => void, interval: number) => {
  const safeInterval = Math.min(interval, MAX_32_BIT_INT);
  const timer = setInterval(fn, safeInterval);
  return timer;
};

// Keepalive check with safe intervals
let lastKeepAliveSuccess = Date.now();
const keepAliveTimer = createSafeInterval(async () => {
  try {
    await pool.query('SELECT 1');
    lastKeepAliveSuccess = Date.now();
  } catch (error) {
    console.warn('Error during connection keepalive check:', error);
    if (Date.now() - lastKeepAliveSuccess > MAX_RETRY_INTERVAL) {
      console.error('Connection appears to be dead, attempting to reconnect...');
      await checkDatabaseConnection();
    }
  }
}, KEEPALIVE_INTERVAL);

// Cleanup handlers
const cleanup = () => {
  clearInterval(keepAliveTimer);
  pool.end().catch(err => {
    console.error('Error during pool shutdown:', err);
  });
};

process.on('exit', cleanup);
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
