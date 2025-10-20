import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export interface HyperdriveEnv {
  HYPERDRIVE: Hyperdrive;
  NODE_ENV?: string;
}

/**
 * Create a postgres.js SQL client connected via Hyperdrive
 * Following Cloudflare best practices:
 * - max: 5 connections (Workers limit on concurrent external connections)
 * - fetch_types: false (avoid extra round-trip if not using array types)
 */
export function createPgClient(env: HyperdriveEnv) {
  return postgres(env.HYPERDRIVE.connectionString, {
    max: 5, // Limit connections for Workers
    fetch_types: false, // Disable if not using array types (reduces latency)
    idle_timeout: 20,
    max_lifetime: 60 * 30, // 30 minutes
  });
}

/**
 * Create a Drizzle database instance with postgres.js client
 */
export function createDrizzleDb(env: HyperdriveEnv): PostgresJsDatabase {
  const sql = createPgClient(env);
  return drizzle(sql);
}

/**
 * Execute a database operation with a postgres.js SQL client
 * The client is automatically closed after the operation
 */
export async function withDatabase<T>(
  env: HyperdriveEnv,
  callback: (sql: ReturnType<typeof postgres>) => Promise<T>
): Promise<T> {
  const sql = createPgClient(env);
  try {
    return await callback(sql);
  } catch (error) {
    console.error('Database operation failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

/**
 * Execute a database operation with Drizzle ORM
 * The connection is automatically closed after the operation
 */
export async function withDrizzle<T>(
  env: HyperdriveEnv,
  callback: (db: PostgresJsDatabase) => Promise<T>
): Promise<T> {
  const sql = createPgClient(env);
  const db = drizzle(sql);
  try {
    return await callback(db);
  } catch (error) {
    console.error('Drizzle operation failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

/**
 * Test database connection via Hyperdrive
 */
export async function testConnection(env: HyperdriveEnv): Promise<boolean> {
  try {
    await withDatabase(env, async (sql) => {
      await sql`SELECT 1`;
    });
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

export function getConnectionInfo(env: HyperdriveEnv) {
  const hyperdrive = env.HYPERDRIVE;
  return {
    database: hyperdrive.database,
    host: hyperdrive.host,
    port: hyperdrive.port,
    user: hyperdrive.user,
  };
}

/**
 * Execute a function within a database transaction
 * Automatically commits on success or rolls back on error
 */
export async function withTransaction<T>(
  env: HyperdriveEnv,
  callback: (sql: ReturnType<typeof postgres>) => Promise<T>
): Promise<T> {
  const sql = createPgClient(env);
  try {
    // postgres.js provides automatic transaction support via .begin()
    const result = await sql.begin(async (tx) => {
      return await callback(tx as any);
    });
    return result as T;
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}