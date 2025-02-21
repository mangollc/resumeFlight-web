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
const poolerUrl = process.env.DATABASE_URL?.replace('.us-east-2', '-pooler.us-east-2');

// Configure the connection pool with retry logic and more conservative settings
export const pool = new Pool({ 
  connectionString: poolerUrl,
  ssl: true,
  max: 3,                         // Reduce max connections for more stability
  idleTimeoutMillis: 10000,       // 10 seconds idle timeout
  connectionTimeoutMillis: 5000,   // 5 seconds connection timeout
  maxUses: 1000,                  // Reduce max uses per connection for stability
  keepAlive: true,                // Enable keepalive
  allowExitOnIdle: true,          // Allow the pool to exit when idle
  retryInterval: 500,             // Increase retry interval
  maxRetries: 5,                  // Increase max retries
  statement_timeout: 10000,        // 10 second query timeout
  query_timeout: 10000,           // 10 second query timeout
});

// Add error handling for the pool
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

// Add connection event handling
pool.on('connect', () => {
  console.log('Successfully connected to database');
});

export const db = drizzle(pool, { schema });