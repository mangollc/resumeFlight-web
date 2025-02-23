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

// Initialize connection pool with proper configuration
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Initialize Drizzle with the pool
export const db = drizzle(pool, { schema });

// Add connection monitoring
pool.on('connect', () => {
  console.log('Database connection established');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Add connection health check
export const checkDatabaseConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection verified:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
};

// Cleanup on process termination
process.on('SIGTERM', async () => {
  console.log('Shutting down database pool...');
  await pool.end();
});

setInterval(async () => {
    try {
        await pool.query('SELECT 1'); 
    } catch (error) {
        console.warn('Error during connection keepalive check:', error);
    }
}, 60000);