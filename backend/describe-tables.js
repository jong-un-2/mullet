#!/usr/bin/env node
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://neondb_owner:npg_9kucNXKpA6eC@ep-solitary-heart-a19z1rs7.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

async function describeTable(tableName) {
  const result = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = $1 AND table_schema = 'public'
    ORDER BY ordinal_position;
  `, [tableName]);
  
  console.log(`\n📋 Table: ${tableName}`);
  if (result.rows.length === 0) {
    console.log('  Table not found or no columns');
    return;
  }
  
  result.rows.forEach(col => {
    console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
  });
  
  // Show sample data
  try {
    const data = await client.query(`SELECT * FROM ${tableName} LIMIT 3`);
    if (data.rows.length > 0) {
      console.log(`  Sample data (${data.rows.length} rows):`);
      data.rows.forEach(row => {
        console.log('   ', JSON.stringify(row));
      });
    } else {
      console.log('  (No data)');
    }
  } catch (e) {
    console.log(`  Error fetching data: ${e.message}`);
  }
}

async function checkAllStructure() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    await describeTable('_cursor_');
    await describeTable('_sink_info_');
    await describeTable('_blocks_');
    await describeTable('mars_vault_deposits');
    await describeTable('mars_vault_states');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

checkAllStructure();
