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

// Initialize connection pool with safe timeout values
const DEFAULT_POOL_CONFIG = {
  max: 10,
  idleTimeoutMillis: 15000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
  query_timeout: 10000,
  allowExitOnIdle: true,
  keepAlive: false
};

export const pool = new Pool({
  ...DEFAULT_POOL_CONFIG,
  connectionString: process.env.DATABASE_URL,
  max: 10
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
    let retries = 3;
    while (retries > 0) {
        try {
            await db.select().from(schema.users).limit(1); // Assuming 'users' table exists in schema
            return true;
        } catch (error) {
            console.error(`Database connection check failed (${retries} retries left):`, error);
            retries--;
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
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