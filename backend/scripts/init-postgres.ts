#!/usr/bin/env tsx

/**
 * Database Initialization Script for PostgreSQL
 * 
 * This script initializes the Mars PostgreSQL database with:
 * - Admin user
 * - Sample API keys
 * - Test vault states
 * - Sample data for development
 * 
 * Usage:
 *   npm run db:init:postgres
 *   DATABASE_URL="postgresql://..." npx tsx scripts/init-postgres.ts
 */

import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as dotenv from 'dotenv';
import * as schema from '../src/database/postgres-schema';
import { randomBytes } from 'crypto';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🚀 Initializing PostgreSQL database...\n');

  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to Neon PostgreSQL\n');
    
    const db = drizzle(client, { schema });

    // Create admin user
    console.log('👤 Creating admin user...');
    const [adminUser] = await db.insert(schema.users).values({
      walletAddress: '4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w',
      email: 'admin@mars-backend.com',
      displayName: 'Mars Admin',
      subscriptionTier: 'enterprise',
      isActive: true,
    }).returning();

    console.log(`✅ Admin user created: ${adminUser.walletAddress}`);

    // Create API key for admin
    console.log('\n🔑 Creating admin API key...');
    const apiKey = `mars_${randomBytes(32).toString('hex')}`;
    
    const [adminApiKey] = await db.insert(schema.apiKeys).values({
      userId: adminUser.id,
      key: apiKey,
      name: 'Admin Development Key',
      description: 'Full access API key for development',
      permissions: ['read', 'write', 'admin'],
      rateLimit: 1000,
      isActive: true,
    }).returning();

    console.log(`✅ API Key created: ${apiKey.substring(0, 20)}...`);
    console.log(`   Full key: ${apiKey}`);

    // Create sample vault states
    console.log('\n🏦 Creating sample vault states...');
    
    const vaults = [
      {
        vaultAddress: 'A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK',
        vaultName: 'PYUSD Vault',
        tokenMint: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
        tokenSymbol: 'PYUSD',
        sharesMint: 'DCqyVY1SFCwq8unnexv9pjujVAC7jsmjfoUWBrNLvbY',
        totalAssets: '1000000.000000',
        totalShares: '950000.000000',
        apy: '5.25',
        tvl: '1000000.00',
      },
      {
        vaultAddress: 'Bxample2VaultAddressForUSDCVaultOnSolana123',
        vaultName: 'USDC Vault',
        tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        tokenSymbol: 'USDC',
        sharesMint: 'SharesMintExampleForUSDCVault12345678901234',
        totalAssets: '5000000.000000',
        totalShares: '4800000.000000',
        apy: '6.75',
        tvl: '5000000.00',
      },
    ];

    for (const vault of vaults) {
      await db.insert(schema.vaultStates).values(vault);
      console.log(`   ✅ ${vault.vaultName} (${vault.tokenSymbol})`);
    }

    // Create sample transaction
    console.log('\n💸 Creating sample transactions...');
    
    await db.insert(schema.transactions).values({
      userId: adminUser.id,
      txHash: '4r1V6R8zMfL4kd8yW2TcSfVoTmad8vW6GcFAAUc3wNLseae6yUoucznFipDMetzquDThtsg4DRWx1Dx8hig6jes8',
      type: 'withdraw',
      status: 'success',
      tokenMint: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
      tokenSymbol: 'PYUSD',
      amount: '2.999997',
      vaultAddress: 'A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK',
      fee: '0.000003',
      priceUsd: '1.00',
      metadata: {
        shares: '2.999301',
        profit: '0.999997',
      },
    });

    console.log('   ✅ Sample withdraw transaction');

    // Create sample farm position
    console.log('\n🌾 Creating sample farm position...');
    
    await db.insert(schema.farmPositions).values({
      userId: adminUser.id,
      farmAddress: 'HtN9eg6qmjPdoRAWXAdMhGe6BJNDDTynGBPvBj2mzEW7',
      vaultAddress: 'A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK',
      stakedShares: '0.000000',
      pendingRewards: '0.000000',
      stakedAt: new Date(),
      isActive: false,
    });

    console.log('   ✅ Sample farm position (closed)');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Database initialization complete!');
    console.log('='.repeat(60));
    console.log('\n📝 Summary:');
    console.log(`   Admin User: ${adminUser.walletAddress}`);
    console.log(`   API Key: ${apiKey}`);
    console.log(`   Vaults: ${vaults.length}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Save the API key securely');
    console.log('   2. Test the API endpoints');
    console.log('   3. Update wrangler.toml with Hyperdrive ID');
    console.log('   4. Deploy to Cloudflare Workers\n');

  } catch (error) {
    console.error('\n❌ Initialization failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔚 Connection closed');
  }
}

main().catch(console.error);
