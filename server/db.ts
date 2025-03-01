import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '@shared/schema';

// Configure WebSocket for Neon database
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

// Create SQL client with debug logging
const sql = neon(process.env.DATABASE_URL);
console.log('Neon SQL client created');

// Create Drizzle instance with debug logging
export const db = drizzle(sql, { schema });
console.log('Drizzle ORM initialized');

// Get current timestamp in EST
export const getCurrentESTTimestamp = async () => {
  try {
    const result = await sql`SELECT NOW() AT TIME ZONE 'America/New_York' as now`;
    return result[0].now;
  } catch (error) {
    console.error('Error getting current timestamp:', error);
    throw error;
  }
};

//Cleanup function for graceful shutdown
const cleanup = () => {
  console.log('Cleanup: Releasing SQL connection');
  sql.end().catch(err => {
    console.error('Error during sql connection release:', err);
  });
};

process.on('exit', cleanup);
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

export async function checkDatabaseConnection() {
  try {
    console.log('Checking database connection...');
    await db.select().from(schema.users).limit(1);
    console.log('Database connection established');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    // Try to reconnect
    try {
      console.log('Attempting database reconnection...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await db.select().from(schema.users).limit(1);
      console.log('Database reconnection successful');
      return true;
    } catch (retryError) {
      console.error('Database reconnection failed:', retryError);
      return false;
    }
  }
}