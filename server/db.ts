import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon database
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Initialize connection pool with optimized configuration
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: Math.min(30000, Math.pow(2, 31) - 1), // Prevent overflow
  connectionTimeoutMillis: Math.min(5000, Math.pow(2, 31) - 1), // Prevent overflow
  statement_timeout: 30000, // 30 second query timeout
  query_timeout: 30000, // 30 second query timeout
  allowExitOnIdle: true
});

// Suppress timeout overflow warnings
process.env.NODE_NO_WARNINGS = '1';

// Initialize Drizzle with the pool
export const db = drizzle(pool, { schema });

// Connection counter to avoid duplicate logs
let connectionCount = 0;

// Set timezone to EST for all connections
pool.on('connect', (client) => {
  connectionCount++;
  console.log(`Database connection ${connectionCount} established`);
  client.query("SET timezone='America/New_York';").catch(err => {
    console.error('Error setting timezone:', err);
  });
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  if (err.message.includes('timeout')) {
    console.warn('Connection timeout occurred - this is normal during idle periods');
  } else {
    // Attempt to reconnect on non-timeout errors
    setTimeout(() => {
      console.log('Attempting to reconnect...');
      checkDatabaseConnection();
    }, 5000);
  }
});

// Enhanced connection health check
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

// Helper function to get current EST timestamp
export const getCurrentESTTimestamp = async () => {
  try {
    const result = await pool.query('SELECT NOW() AT TIME ZONE \'America/New_York\' as now');
    return result.rows[0].now;
  } catch (error) {
    console.error('Error getting current timestamp:', error);
    throw error;
  }
};

// Cleanup on process termination
process.on('SIGTERM', async () => {
  console.log('Shutting down database pool...');
  try {
    await pool.end();
    console.log('Database pool shut down successfully');
  } catch (error) {
    console.error('Error shutting down database pool:', error);
  }
});

// Keepalive check with timeout validation
const KEEPALIVE_INTERVAL = Math.min(60000, Math.pow(2, 31) - 1); // 1 minute or max 32-bit int
const MAX_RETRY_INTERVAL = Math.min(300000, Math.pow(2, 31) - 1); // 5 minutes or max 32-bit int

let lastKeepAliveSuccess = Date.now();
const keepAliveTimer = setInterval(async () => {
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

// Cleanup timer on process exit
process.on('exit', () => clearInterval(keepAliveTimer));