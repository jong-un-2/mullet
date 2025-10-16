/**
 * 解析 UserState 数据结构
 */
import { Connection, PublicKey } from '@solana/web3.js';

const RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3';

function parseUserState(data: Buffer, name: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 解析 UserState: ${name}`);
  console.log('='.repeat(80));
  
  // 打印前 200 字节，每 32 字节一行
  console.log('\n原始数据 (hex):');
  for (let i = 0; i < Math.min(200, data.length); i += 32) {
    const hex = data.slice(i, i + 32).toString('hex');
    console.log(`  [${i.toString().padStart(3, '0')}-${(i+31).toString().padStart(3, '0')}]: ${hex}`);
  }
  
  console.log('\n尝试解析字段:');
  
  // Discriminator (8 bytes)
  const discriminator = data.slice(0, 8);
  console.log(`  [000-007] Discriminator: ${discriminator.toString('hex')}`);
  
  // 尝试不同的偏移量读取 PublicKey (32 bytes)
  const offsets = [8, 16, 24, 32, 40];
  for (const offset of offsets) {
    if (offset + 32 <= data.length) {
      const pubkey = new PublicKey(data.slice(offset, offset + 32));
      console.log(`  [${offset.toString().padStart(3, '0')}-${(offset+31).toString().padStart(3, '0')}] PublicKey: ${pubkey.toString()}`);
    }
  }
}

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed');
  
  console.log('\n🚀 开始解析 UserState 数据...\n');
  
  // Vault UserState
  const vaultUserState = new PublicKey('HtN9eg6qmjPdoRAWXAdMhGe6BJNDDTynGBPvBj2mzEW7');
  const vaultData = await connection.getAccountInfo(vaultUserState);
  if (vaultData) {
    parseUserState(vaultData.data, 'Vault UserState');
  }
  
  // Reserve UserState
  const reserveUserState = new PublicKey('2gYh4BrV4ghR6ByvNnLpLDfWqkfgWqA8DFVWzxKQYkZN');
  const reserveData = await connection.getAccountInfo(reserveUserState);
  if (reserveData) {
    parseUserState(reserveData.data, 'Reserve UserState');
  }
  
  console.log('\n✅ 解析完成\n');
  
  // 对比 SDK 提供的值
  console.log('\n📌 SDK 提供的 farm_state:');
  console.log('   Vault:   8hznHD38esVyPps3hUcFahynwekYUfjn43PRz9n5PDZN');
  console.log('   Reserve: DEe2NZ5dAXGxC7M8Gs9Esd9wZRPdQzG8jNamXqhL5yku');
}

main().catch(console.error);
