import { neon, neonConfig } from '@neondatabase/serverless';
import pg from 'pg';
const { Pool } = pg;
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '@shared/schema';

// Configure WebSocket for Neon database
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

// Constants for timeouts (in milliseconds)
const MAX_32_BIT_INT = 2147483647;
const TIMEOUT_30_SEC = 30000;
const TIMEOUT_5_MIN = 300000;

// Initialize connection pool with safe timeout values
const MAX_SAFE_TIMEOUT = 2147483647;
const DEFAULT_POOL_CONFIG = {
  max: 10,
  idleTimeoutMillis: Math.min(300000, MAX_SAFE_TIMEOUT),
  connectionTimeoutMillis: Math.min(30000, MAX_SAFE_TIMEOUT),
  statement_timeout: Math.min(30000, MAX_SAFE_TIMEOUT),
  query_timeout: Math.min(30000, MAX_SAFE_TIMEOUT),
  allowExitOnIdle: true,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};

export const pool = new Pool({
  ...DEFAULT_POOL_CONFIG,
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: Math.min(300000, MAX_SAFE_TIMEOUT),
  connectionTimeoutMillis: Math.min(30000, MAX_SAFE_TIMEOUT),
  statement_timeout: Math.min(30000, MAX_SAFE_TIMEOUT),
  query_timeout: Math.min(30000, MAX_SAFE_TIMEOUT),
  allowExitOnIdle: true
});

// Initialize Drizzle with the pool
export const db = drizzle(pool, { schema });

let connectionCount = 0;

pool.on('connect', async (client) => {
  connectionCount++;
  console.log(`Database connection ${connectionCount} established`);
  try {
    await pool.query("SET timezone = 'America/New_York'");
  } catch (err) {
    console.error('Error setting timezone:', err);
  }
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
});

export const checkDatabaseConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW() as now');
    console.log('Database connection verified:', result.rows[0].now); //Added logging for better debugging
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
};

// Get current timestamp in EST
export const getCurrentESTTimestamp = async () => {
  try {
    const result = await pool.query("SELECT NOW() AT TIME ZONE 'America/New_York' as now");
    return result.rows[0].now;
  } catch (error) {
    console.error('Error getting current timestamp:', error);
    throw error;
  }
};

// Cleanup function for graceful shutdown
const cleanup = () => {
  pool.end().catch(err => {
    console.error('Error during pool shutdown:', err);
  });
};

process.on('exit', cleanup);
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);