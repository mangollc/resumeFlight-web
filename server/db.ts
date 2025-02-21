import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure the connection pool with more conservative timeout settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 10000, // Reduced from 30000
  connectionTimeoutMillis: 3000, // Reduced from 5000
  maxUses: 7500,
  keepAlive: true,
  keepAliveTimeoutMillis: 10000 // Reduced from 30000
});

export const db = drizzle(pool, { schema });