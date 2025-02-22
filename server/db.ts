import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon with more resilient settings
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineTLS = true;
neonConfig.pipelineConnect = false; // Disable pipelining for more stable connections

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use pooler URL for more stable connections
const poolerUrl = process.env.DATABASE_URL?.replace('postgres://', 'postgres://').replace('.us-east-2', '-pooler.us-east-2');

// Configure the connection pool with more conservative settings
export const pool = new Pool({ 
  connectionString: poolerUrl,
  ssl: true,
  max: 3,                         // Reduce max connections to prevent overwhelming
  min: 1,                         // Ensure at least one connection is maintained
  idleTimeoutMillis: 30000,       // 30 seconds idle timeout
  connectionTimeoutMillis: 10000,  // 10 seconds connection timeout
  maxUses: 7500,                  // Reduce max uses per connection for stability
  keepAlive: true,                // Enable keepalive
  allowExitOnIdle: false,         // Prevent pool from exiting when idle
  statement_timeout: 60000,        // 1 minute query timeout
  query_timeout: 60000,           // 1 minute query timeout
  application_name: 'resume-app',  // Add application name for better monitoring
  keepAliveInitialDelayMillis: 10000, // Initial delay for keepalive
});

let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Add connection event handling with reconnection logic
pool.on('connect', (client) => {
  console.log('Database connection established');
  isConnected = true;
  reconnectAttempts = 0;

  // Set session parameters for better stability
  client.query(`
    SET SESSION idle_in_transaction_session_timeout = '30s';
    SET SESSION statement_timeout = '60s';
  `).catch((err: Error) => {
    console.warn('Failed to set session parameters:', err.message);
  });
});

// Handle pool errors with reconnection logic
pool.on('error', async (err: Error) => {
  console.error('Unexpected error on database client:', err.message);
  isConnected = false;

  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    console.log(`Attempting to reconnect... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

    try {
      await pool.connect();
    } catch (error: unknown) {
      const reconnectError = error as Error;
      console.error('Reconnection attempt failed:', reconnectError.message);
    }
  } else {
    console.error('Max reconnection attempts reached. Manual intervention required.');
    process.exit(1);
  }
});

// Remove verbose logging of client acquisition
pool.on('acquire', () => {
  if (!isConnected) {
    console.log('Database connection reestablished');
    isConnected = true;
  }
});

// Only log when clients are removed (which is less frequent)
pool.on('remove', () => {
  console.log('Database client removed from pool');
});

// Export configured pool and Drizzle instance
export const db = drizzle(pool, { schema });

// Export helper function to check connection status
export const checkDatabaseConnection = async () => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error: unknown) {
    const dbError = error as Error;
    console.error('Database connection check failed:', dbError.message);
    return false;
  }
};