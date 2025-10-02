#!/usr/bin/env node
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://neondb_owner:npg_9kucNXKpA6eC@ep-solitary-heart-a19z1rs7.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkDatabase() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // 查看所有表
    console.log('📋 All tables:');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    console.log('\n📊 Mars vault tables data count:');
    
    // 检查各个表的数据量
    const marsTables = [
      'mars_vault_deposits',
      'mars_vault_withdrawals',
      'mars_vault_swaps',
      'mars_vault_rebalances',
      'mars_vault_states'
    ];

    for (const table of marsTables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  ${table}: ${result.rows[0].count} rows`);
      } catch (e) {
        console.log(`  ${table}: Table not found or error`);
      }
    }

    // 检查 substreams cursor 表
    console.log('\n🔖 Substreams cursor info:');
    try {
      const cursor = await client.query(`
        SELECT * FROM cursors 
        ORDER BY id DESC LIMIT 1;
      `);
      if (cursor.rows.length > 0) {
        console.log('  Cursor:', JSON.stringify(cursor.rows[0], null, 2));
      } else {
        console.log('  No cursor found (indexing not started yet)');
      }
    } catch (e) {
      console.log('  Cursors table not found');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

checkDatabase();
