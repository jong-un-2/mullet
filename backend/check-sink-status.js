#!/usr/bin/env node
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://neondb_owner:npg_9kucNXKpA6eC@ep-solitary-heart-a19z1rs7.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkSinkStatus() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // 检查 _cursor_ 表
    console.log('🔖 Checking _cursor_ table:');
    try {
      const cursor = await client.query('SELECT * FROM _cursor_ ORDER BY id DESC LIMIT 5');
      if (cursor.rows.length > 0) {
        console.log('  Last cursor:', JSON.stringify(cursor.rows[0], null, 2));
      } else {
        console.log('  ⚠️  No cursor data (sink may not have started yet)');
      }
    } catch (e) {
      console.log('  ❌ Error:', e.message);
    }

    // 检查 _sink_info_ 表
    console.log('\n📊 Checking _sink_info_ table:');
    try {
      const sinkInfo = await client.query('SELECT * FROM _sink_info_ LIMIT 5');
      if (sinkInfo.rows.length > 0) {
        sinkInfo.rows.forEach(row => {
          console.log('  Sink info:', JSON.stringify(row, null, 2));
        });
      } else {
        console.log('  ⚠️  No sink info');
      }
    } catch (e) {
      console.log('  ❌ Error:', e.message);
    }

    // 检查 _blocks_ 表
    console.log('\n🧱 Checking _blocks_ table:');
    try {
      const blocks = await client.query('SELECT * FROM _blocks_ ORDER BY id DESC LIMIT 5');
      if (blocks.rows.length > 0) {
        console.log(`  Total blocks processed: ${blocks.rows.length}`);
        console.log('  Latest blocks:', JSON.stringify(blocks.rows, null, 2));
      } else {
        console.log('  ⚠️  No blocks processed yet');
      }
    } catch (e) {
      console.log('  ❌ Error:', e.message);
    }

    // 检查所有表的最近更新时间
    console.log('\n⏰ Checking table sizes and recent activity:');
    const marsTables = [
      'mars_vault_deposits',
      'mars_vault_withdrawals', 
      'mars_vault_swaps',
      'mars_vault_rebalances',
      'mars_vault_states'
    ];

    for (const table of marsTables) {
      try {
        const count = await client.query(`SELECT COUNT(*) FROM ${table}`);
        const recent = await client.query(`
          SELECT * FROM ${table} 
          ORDER BY block_num DESC 
          LIMIT 1
        `);
        
        console.log(`\n  ${table}:`);
        console.log(`    Rows: ${count.rows[0].count}`);
        if (recent.rows.length > 0) {
          console.log(`    Latest: Block ${recent.rows[0].block_num}`);
        }
      } catch (e) {
        console.log(`    ❌ Error: ${e.message}`);
      }
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

checkSinkStatus();
