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

// Configure the connection pool with more resilient settings
export const pool = new Pool({ 
  connectionString: poolerUrl,
  ssl: true,
  max: 5,                         // Increase max connections for better availability
  idleTimeoutMillis: 60000,       // 60 seconds idle timeout
  connectionTimeoutMillis: 15000,  // 15 seconds connection timeout
  maxUses: 5000,                  // Reduce max uses for more frequent recycling
  keepAlive: true,                // Enable keepalive
  allowExitOnIdle: true,          // Allow the pool to exit when idle
  statement_timeout: 45000,        // 45 second query timeout
  query_timeout: 45000,           // 45 second query timeout
  application_name: 'resume-app',  // Add application name for better monitoring
  retryDelay: 1000,               // Add 1 second delay between retries
  retryLimit: 3                   // Retry failed connections up to 3 times
});

// Add error handling for the pool
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

// Add connection event handling - only log initial connection
pool.on('connect', () => {
  console.log('Database connection pool initialized');
});

// Remove verbose logging of client acquisition
// Only log when clients are removed (which is less frequent)
pool.on('remove', () => {
  console.log('Database client removed from pool');
});

export const db = drizzle(pool, { schema });