#!/usr/bin/env node

/**
 * 应用 Mars 表迁移到 D1 数据库
 */

const fs = require('fs');
const path = require('path');

async function applyMarsTableMigration() {
  console.log('🚀 Applying Mars tables migration...');
  
  try {
    // 读取迁移文件
    const migrationPath = path.join(__dirname, '../drizzle/0001_mars_transactions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL loaded');
    console.log('');
    console.log('SQL to be executed:');
    console.log('-------------------');
    console.log(migrationSQL);
    console.log('-------------------');
    console.log('');
    
    console.log('✨ Mars tables migration ready!');
    console.log('');
    console.log('To apply this migration to your D1 database, run:');
    console.log('');
    console.log('# For local development:');
    console.log('npx wrangler d1 execute d1-dex-database --local --file=drizzle/0001_mars_transactions.sql');
    console.log('');
    console.log('# For production:');
    console.log('npx wrangler d1 execute d1-dex-database --file=drizzle/0001_mars_transactions.sql');
    console.log('');
    
  } catch (error) {
    console.error('❌ Failed to prepare migration:', error);
    process.exit(1);
  }
}

applyMarsTableMigration();