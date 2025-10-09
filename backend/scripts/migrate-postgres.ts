#!/usr/bin/env tsx

/**
 * PostgreSQL Migration Script
 * 
 * This script runs Drizzle ORM migrations against the Neon PostgreSQL database.
 * 
 * Usage:
 *   npm run migrate:postgres
 *   DATABASE_URL="postgresql://..." npx tsx scripts/migrate-postgres.ts
 * 
 * Environment Variables:
 *   DATABASE_URL - Neon PostgreSQL connection string (required)
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🚀 Starting PostgreSQL migrations...\n');

  // Get database URL
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL environment variable is required');
    console.error('   Set it in .env file or pass as environment variable');
    console.error('\n   Example:');
    console.error('   DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/mars_db?sslmode=require"');
    process.exit(1);
  }

  console.log('📋 Database:', maskConnectionString(databaseUrl));

  // Check if migrations directory exists
  const migrationsDir = path.join(process.cwd(), 'drizzle', 'postgres');
  
  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ ERROR: Migrations directory not found: ${migrationsDir}`);
    console.error('   Run: npx drizzle-kit generate:pg');
    process.exit(1);
  }

  // List migration files
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (migrationFiles.length === 0) {
    console.log('⚠️  No migration files found');
    console.log('   Run: npx drizzle-kit generate:pg');
    process.exit(0);
  }

  console.log(`\n📦 Found ${migrationFiles.length} migration file(s):`);
  migrationFiles.forEach(f => console.log(`   - ${f}`));
  console.log('');

  // Create postgres.js connection
  const sql = postgres(databaseUrl, {
    max: 10, // More connections for migrations
    ssl: 'require',
  });

  try {
    console.log('✅ Connected to Neon PostgreSQL\n');

    // Create Drizzle instance
    const db = drizzle(sql);

    console.log('🔄 Running migrations...\n');

    // Run migrations
    await migrate(db, { migrationsFolder: migrationsDir });

    console.log('✅ Migrations completed successfully!\n');

    // Verify tables
    console.log('🔍 Verifying tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

    console.log(`\n✅ Found ${tables.length} table(s):`);
    tables.forEach((t: any) => console.log(`   - ${t.table_name}`));
    console.log('');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    await sql.end();
    console.log('🔚 Connection closed');
  }
}

/**
 * Mask sensitive parts of connection string for logging
 */
function maskConnectionString(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '****';
    }
    return parsed.toString();
  } catch {
    return '***masked***';
  }
}

// Run main function
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
