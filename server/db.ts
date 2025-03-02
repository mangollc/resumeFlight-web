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
const MAX_32_BIT = Math.pow(2, 31) - 1;
const TIMEOUT_30_SEC = 30000;
const TIMEOUT_5_MIN = 300000;

// Initialize connection pool with more resilient timeout values
const DEFAULT_POOL_CONFIG = {
  max: 20,                          // Increase maximum connections
  min: 2,                           // Minimum number of connections to maintain
  idleTimeoutMillis: 60000,         // Increase idle timeout to 1 minute
  connectionTimeoutMillis: 15000,   // Increase connection timeout
  statement_timeout: 60000,         // Increase statement timeout
  query_timeout: 60000,             // Increase query timeout
  allowExitOnIdle: false,
  keepAlive: true,
  keepAliveInitialDelayMillis: 5000,
  maxUses: 100,                     // Recycle connections after 100 uses
  retry: {
    retries: 3,                     // Retry failed connections
    delay: 500                      // Delay between retries
  }
};

// Use the connection pooler endpoint for Neon
const connectionString = process.env.DATABASE_URL?.replace('.us-east-2', '-pooler.us-east-2');

export const pool = new Pool({
  ...DEFAULT_POOL_CONFIG,
  connectionString,
  max: 20
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

export async function checkDatabaseConnection() {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      await db.select().from(schema.users).limit(1);
      if (retryCount > 0) {
        console.log(`Database reconnection successful after ${retryCount} retries`);
      } else {
        console.log('Database connection established');
      }
      return true;
    } catch (error) {
      retryCount++;
      console.error(`Database connection error (attempt ${retryCount}/${maxRetries}):`, error);
      
      if (retryCount < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s...
        const backoffTime = Math.pow(2, retryCount - 1) * 1000;
        console.log(`Retrying in ${backoffTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }
  
  console.error('Database connection failed after maximum retries');
  return false;
}

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