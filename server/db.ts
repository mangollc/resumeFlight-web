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

// Safely construct pooler URL
const getPoolerUrl = (url: string): string => {
    try {
        const originalUrl = new URL(url);
        const hostname = originalUrl.hostname;
        const poolerHostname = hostname.includes('-pooler.') 
            ? hostname 
            : hostname.replace('.', '-pooler.');
        originalUrl.hostname = poolerHostname;
        return originalUrl.toString();
    } catch (error) {
        console.error('Error parsing DATABASE_URL:', error);
        return url; // Fallback to original URL if parsing fails
    }
};

const poolerUrl = getPoolerUrl(process.env.DATABASE_URL);

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
const RECONNECT_DELAY = 5000; // 5 seconds delay between reconnection attempts

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

// Handle pool errors with improved reconnection logic
pool.on('error', async (err: Error) => {
    console.error('Unexpected error on database client:', err.message);
    isConnected = false;

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Attempting to reconnect... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

        try {
            // Add delay before reconnection attempt
            await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY));
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

// Cleanup idle connections periodically
setInterval(async () => {
    try {
        await pool.query('SELECT 1'); // Keep connection alive
    } catch (error) {
        console.warn('Error during connection keepalive check:', error);
    }
}, 60000); // Check every minute

// Handle process shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down database pool...');
    try {
        await pool.end();
        console.log('Database pool shut down successfully');
    } catch (error) {
        console.error('Error shutting down database pool:', error);
    }
});

// Export configured pool and Drizzle instance
export const db = drizzle(pool, { schema });

// Enhanced database connection check
export const checkDatabaseConnection = async () => {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('Database connection verified:', result.rows[0].now);
        return true;
    } catch (error: unknown) {
        const dbError = error as Error;
        console.error('Database connection check failed:', dbError.message);
        return false;
    }
};