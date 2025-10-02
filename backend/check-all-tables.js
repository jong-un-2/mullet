#!/usr/bin/env node
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://neondb_owner:npg_9kucNXKpA6eC@ep-solitary-heart-a19z1rs7.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkAllTables() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // 获取所有表
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log(`📊 Total tables: ${tablesResult.rows.length}\n`);

    // 检查每个表的行数和最近更新
    for (const { table_name } of tablesResult.rows) {
      try {
        // 获取行数
        const countResult = await client.query(`SELECT COUNT(*) FROM ${table_name}`);
        const count = parseInt(countResult.rows[0].count);

        if (count > 0) {
          console.log(`\n📋 ${table_name} (${count} rows)`);
          
          // 获取列信息
          const columnsResult = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = $1 AND table_schema = 'public'
            ORDER BY ordinal_position
            LIMIT 10;
          `, [table_name]);
          
          const columns = columnsResult.rows.map(c => c.column_name);
          console.log(`   Columns: ${columns.join(', ')}`);

          // 显示最近的数据
          const dataResult = await client.query(`SELECT * FROM ${table_name} ORDER BY 1 DESC LIMIT 3`);
          console.log(`   Sample data (${dataResult.rows.length} rows):`);
          dataResult.rows.forEach((row, idx) => {
            const preview = JSON.stringify(row).substring(0, 200);
            console.log(`     ${idx + 1}. ${preview}${JSON.stringify(row).length > 200 ? '...' : ''}`);
          });
        } else {
          console.log(`⚪ ${table_name} (0 rows)`);
        }
      } catch (e) {
        console.log(`❌ ${table_name}: Error - ${e.message}`);
      }
    }

    // 特别检查 Substreams 元数据表
    console.log('\n\n🔍 Substreams Metadata:');
    console.log('=' .repeat(50));
    
    // _cursor_
    try {
      const cursor = await client.query('SELECT * FROM _cursor_');
      console.log('\n📍 Current Cursor:');
      if (cursor.rows.length > 0) {
        cursor.rows.forEach(row => {
          console.log(`   ${row.name}: ${row.cursor.substring(0, 50)}...`);
        });
      }
    } catch (e) {
      console.log('   No cursor data');
    }

    // _blocks_
    try {
      const blocks = await client.query('SELECT COUNT(*), MIN(number), MAX(number) FROM _blocks_');
      const latest = await client.query('SELECT * FROM _blocks_ ORDER BY number DESC LIMIT 5');
      console.log('\n🧱 Blocks Processed:');
      if (blocks.rows.length > 0) {
        console.log(`   Total: ${blocks.rows[0].count} blocks`);
        console.log(`   Range: ${blocks.rows[0].min} - ${blocks.rows[0].max}`);
      }
      console.log('\n   Latest blocks:');
      latest.rows.forEach(block => {
        console.log(`     Block ${block.number}: ${block.hash} at ${block.timestamp}`);
      });
    } catch (e) {
      console.log('   Error reading blocks:', e.message);
    }

    // _sink_info_
    try {
      const sinkInfo = await client.query('SELECT * FROM _sink_info_');
      console.log('\n📊 Sink Info:');
      if (sinkInfo.rows.length > 0) {
        console.log(`   Schema Hash: ${sinkInfo.rows[0].schema_hash}`);
      }
    } catch (e) {
      console.log('   No sink info');
    }

    // 检查是否有任何 vault 相关的事件表有数据
    console.log('\n\n🔍 Vault-related Event Tables:');
    console.log('=' .repeat(50));
    
    const vaultTables = [
      'vaultdepositevent',
      'vaultwithdrawevent',
      'swapanddepositevent',
      'rebalanceevent',
      'kaminodepositevent',
      'kaminowithdrawevent',
      'kaminostakeevent',
      'kaminounstakeevent',
      'withdrawwithswapevent',
      'mars_vault_deposits',
      'mars_vault_withdrawals',
      'mars_vault_swaps',
      'mars_vault_rebalances',
      'mars_vault_states'
    ];

    for (const table of vaultTables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        const count = parseInt(result.rows[0].count);
        if (count > 0) {
          console.log(`   ✅ ${table}: ${count} rows`);
          // 显示一条样本数据
          const sample = await client.query(`SELECT * FROM ${table} LIMIT 1`);
          console.log(`      Sample: ${JSON.stringify(sample.rows[0]).substring(0, 150)}...`);
        } else {
          console.log(`   ⚪ ${table}: 0 rows`);
        }
      } catch (e) {
        console.log(`   ❌ ${table}: ${e.message}`);
      }
    }

  } catch (err) {
    console.error('❌ Fatal Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
  }
}

checkAllTables();
