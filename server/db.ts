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

// Configure the connection pool with retry logic and more conservative settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 5,                         // Reduce max connections for stability
  idleTimeoutMillis: 15000,      // 15 seconds idle timeout
  connectionTimeoutMillis: 3000,  // 3 seconds connection timeout
  maxUses: 5000,                 // Reduce max uses per connection
  keepAlive: true,               // Enable keepalive
  allowExitOnIdle: true,         // Allow the pool to exit when idle
  retryInterval: 100,            // Add retry interval
  maxRetries: 3                  // Add max retries
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