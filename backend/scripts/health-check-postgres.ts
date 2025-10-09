#!/usr/bin/env tsx

/**
 * Health Check Script for PostgreSQL via Hyperdrive
 * 
 * This script verifies:
 * - Hyperdrive connection
 * - Database accessibility
 * - Table existence
 * - Basic query performance
 * 
 * Usage:
 *   npm run health:postgres
 *   DATABASE_URL="postgresql://..." npx tsx scripts/health-check-postgres.ts
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as dotenv from 'dotenv';
import * as schema from '../src/database/postgres-schema';
import { sql as sqlOperator } from 'drizzle-orm';

dotenv.config();

async function main() {
  console.log('🏥 PostgreSQL Health Check\n');
  console.log('='.repeat(60));

  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  const sql = postgres(databaseUrl, {
    max: 5,
    ssl: 'require',
    connect_timeout: 10,
  });

  const startTime = Date.now();
  let allChecks = true;

  try {
    console.log('✅ Connected to Neon PostgreSQL\n');

    // Test 1: Basic connectivity
    console.log('1️⃣  Testing basic connectivity...');
    try {
      await sql`SELECT 1 as check`;
      console.log('   ✅ Connected successfully');
    } catch (error) {
      console.error('   ❌ Connection failed:', error);
      allChecks = false;
    }

    // Test 2: Database version
    console.log('\n2️⃣  Checking PostgreSQL version...');
    try {
      const result = await sql`SELECT version()`;
      const version = result[0];
      console.log(`   ✅ ${version.version.split(',')[0]}`);
    } catch (error) {
      console.error('   ❌ Version check failed:', error);
      allChecks = false;
    }

    // Test 3: List tables
    console.log('\n3️⃣  Checking tables...');
    try {
      const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `;
      
      if (tables.length > 0) {
        console.log(`   ✅ Found ${tables.length} table(s):`);
        tables.forEach((t: any) => console.log(`      - ${t.table_name}`));
      } else {
        console.log('   ⚠️  No tables found (database might not be initialized)');
        allChecks = false;
      }
    } catch (error) {
      console.error('   ❌ Table listing failed:', error);
      allChecks = false;
    }

    // Test 4: Drizzle ORM connectivity
    console.log('\n4️⃣  Testing Drizzle ORM...');
    try {
      const db = drizzle(sql, { schema });
      
      // Check if mars_vault_states table exists and get count
      const stateCount = await db
        .select({ count: sqlOperator`count(*)` })
        .from(schema.marsVaultStates);
      
      console.log(`   ✅ Drizzle ORM working`);
      console.log(`   📊 Vault states in database: ${stateCount[0].count}`);
    } catch (error) {
      console.error('   ❌ Drizzle ORM test failed:', error);
      console.error('   💡 Hint: Run migrations first (npm run migrate:postgres)');
      allChecks = false;
    }

    // Test 5: Write test
    console.log('\n5️⃣  Testing write operations...');
    try {
      const db = drizzle(sql, { schema });
      const testVault = `test_vault_${Date.now()}`;
      const testTime = new Date();
      
      // Insert test vault state
      const [testState] = await db.insert(schema.marsVaultStates).values({
        vaultAddress: testVault,
        admin: 'test_admin',
        baseTokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        sharesMint: 'test_shares_mint',
        totalDeposits: '0',
        totalShares: '0',
        status: 'active',
        createdAt: testTime,
        lastUpdated: testTime,
      }).returning();

      // Read it back
      const found = await db
        .select()
        .from(schema.marsVaultStates)
        .where(sqlOperator`vault_address = ${testVault}`);

      // Delete test vault state
      await db
        .delete(schema.marsVaultStates)
        .where(sqlOperator`vault_address = ${testVault}`);

      if (found.length === 1 && found[0].admin === 'test_admin') {
        console.log('   ✅ Write/Read/Delete operations working');
      } else {
        console.log('   ❌ Data integrity check failed');
        allChecks = false;
      }
    } catch (error) {
      console.error('   ❌ Write test failed:', error);
      allChecks = false;
    }

    // Test 6: Performance test
    console.log('\n6️⃣  Testing query performance...');
    try {
      const queryStart = Date.now();
      await sql`SELECT * FROM mars_vault_states LIMIT 10`;
      const queryTime = Date.now() - queryStart;
      
      console.log(`   ✅ Query completed in ${queryTime}ms`);
      
      if (queryTime > 1000) {
        console.log('   ⚠️  Query is slow (>1000ms)');
      }
    } catch (error) {
      console.error('   ❌ Performance test failed:', error);
      allChecks = false;
    }

    // Test 7: Connection info
    console.log('\n7️⃣  Connection information...');
    try {
      const info = await sql`
        SELECT 
          current_database() as database,
          current_user as "user",
          inet_server_addr() as host,
          inet_server_port() as port,
          pg_backend_pid() as pid
      `;
      
      const row = info[0];
      console.log(`   ✅ Database: ${row.database}`);
      console.log(`   ✅ User: ${row.user}`);
      console.log(`   ✅ Process ID: ${row.pid}`);
    } catch (error) {
      console.error('   ❌ Connection info failed:', error);
    }

    // Final summary
    const totalTime = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(60));
    if (allChecks) {
      console.log('✅ All health checks passed!');
    } else {
      console.log('⚠️  Some health checks failed');
    }
    console.log(`⏱️  Total time: ${totalTime}ms`);
    console.log('='.repeat(60) + '\n');

    process.exit(allChecks ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Health check failed with unexpected error:', error);
    process.exit(1);
  } finally {
    await sql.end();
    console.log('🔚 Connection closed');
  }
}

main().catch(console.error);
