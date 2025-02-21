import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;  // Enable secure WebSocket
neonConfig.pipelineTLS = true;        // Enable TLS pipeline
neonConfig.pipelineConnect = true;    // Enable connection pipelining

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure the connection pool with timeout values that won't trigger Node.js TimeoutOverflowWarning
// Note: These warnings only appear in development and don't affect production functionality
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 10,                        // Reduced max connections
  idleTimeoutMillis: 15000,      // 15 seconds - reduced to prevent timeout overflow
  connectionTimeoutMillis: 3000,  // 3 seconds - reduced to prevent timeout overflow
  maxUses: 7500,                 // Maximum number of uses before a connection is closed
  keepAlive: false,              // Disabled to prevent connection issues
  allowExitOnIdle: true          // Allow the pool to exit when idle
});

// Add error handling for the pool
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

export const db = drizzle(pool, { schema });