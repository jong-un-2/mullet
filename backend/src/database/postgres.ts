import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export interface HyperdriveEnv {
  HYPERDRIVE: Hyperdrive;
  NODE_ENV?: string;
}

export async function createPgClient(env: HyperdriveEnv): Promise<Client> {
  const connectionString = env.HYPERDRIVE.connectionString;
  
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10000,
    query_timeout: 30000,
    statement_timeout: 30000,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  return client;
}

export async function createDrizzleDb(env: HyperdriveEnv): Promise<NodePgDatabase> {
  const client = await createPgClient(env);
  return drizzle(client);
}

export async function withDatabase<T>(
  env: HyperdriveEnv,
  callback: (client: Client) => Promise<T>
): Promise<T> {
  const client = await createPgClient(env);
  try {
    return await callback(client);
  } catch (error) {
    console.error('Database operation failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

export async function withDrizzle<T>(
  env: HyperdriveEnv,
  callback: (db: NodePgDatabase) => Promise<T>
): Promise<T> {
  const client = await createPgClient(env);
  const db = drizzle(client);
  try {
    return await callback(db);
  } catch (error) {
    console.error('Drizzle operation failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

export async function testConnection(env: HyperdriveEnv): Promise<boolean> {
  try {
    await withDatabase(env, async (client) => {
      await client.query('SELECT 1');
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

export async function withTransaction<T>(
  env: HyperdriveEnv,
  callback: (client: Client) => Promise<T>
): Promise<T> {
  const client = await createPgClient(env);
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}
