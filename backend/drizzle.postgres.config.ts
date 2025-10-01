import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit configuration for PostgreSQL with Neon
 * 
 * This configuration is used for:
 * - Generating migration files
 * - Pushing schema changes to the database
 * - Introspecting existing databases
 * 
 * Usage:
 * - Generate migrations: `npx drizzle-kit generate:pg`
 * - Push to database: `npx drizzle-kit push:pg`
 * - View schema: `npx drizzle-kit studio`
 */

export default defineConfig({
  // Schema location
  schema: './src/database/postgres-schema.ts',
  
  // Output directory for migrations
  out: './drizzle/postgres',
  
  // Database dialect
  dialect: 'postgresql',
  
  // Database credentials
  dbCredentials: {
    // For local development, use Neon DSN from environment
    // For production, this is managed by Hyperdrive
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/mars_db',
  },
  
  // Migration options
  verbose: true,
  strict: true,
});
