/**
 * 检查 farm_state 账户的实际所有者
 */
import { Connection, PublicKey } from '@solana/web3.js';

const RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3';

async function checkAccount(connection: Connection, address: string, name: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 检查账户: ${name}`);
  console.log(`   地址: ${address}`);
  console.log('='.repeat(80));
  
  try {
    const pubkey = new PublicKey(address);
    const accountInfo = await connection.getAccountInfo(pubkey);
    
    if (!accountInfo) {
      console.log('❌ 账户不存在');
      return;
    }
    
    console.log(`✅ 账户存在`);
    console.log(`   Owner: ${accountInfo.owner.toString()}`);
    console.log(`   Lamports: ${accountInfo.lamports}`);
    console.log(`   Data length: ${accountInfo.data.length} bytes`);
    console.log(`   Executable: ${accountInfo.executable}`);
    
    // 检查是否是 Kamino Farms 程序
    const KAMINO_FARMS = 'FarmsPZpWu9i7Kky8tPN37rs2TpmMrAZrC7S7vJa91Hr';
    if (accountInfo.owner.toString() === KAMINO_FARMS) {
      console.log('✅ 是 Kamino Farms 程序拥有的账户');
    } else if (accountInfo.owner.toString() === '11111111111111111111111111111111') {
      console.log('⚠️  是 System Program 拥有的账户（可能是普通账户或 PDA）');
    } else {
      console.log(`⚠️  是其他程序拥有的账户: ${accountInfo.owner.toString()}`);
    }
    
    // 打印前 100 字节的数据
    if (accountInfo.data.length >= 100) {
      console.log('\n📊 数据前 100 字节:');
      const hex = accountInfo.data.slice(0, 100).toString('hex');
      for (let i = 0; i < hex.length; i += 64) {
        console.log(`   ${i.toString().padStart(3, '0')}: ${hex.slice(i, i + 64)}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  }
}

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed');
  
  console.log('\n🚀 开始检查账户...\n');
  
  // 从 UserState 读取的 farm_state (偏移量 8-40)
  await checkAccount(
    connection,
    'DPMKixm76K4Vwne3PvruH9NzSpZiJvipFYRbP8kt1kVL',
    'Vault UserState 偏移 8-40 读取的地址'
  );
  
  await checkAccount(
    connection,
    'BWsfaahxt5tCkXqM6312s5FGyfQucns8CbSyigpSmyRX',
    'Reserve UserState 偏移 8-40 读取的地址'
  );
  
  // SDK 提供的 farm_state
  await checkAccount(
    connection,
    '8hznHD38esVyPps3hUcFahynwekYUfjn43PRz9n5PDZN',
    'SDK 提供的 Vault Farm State'
  );
  
  await checkAccount(
    connection,
    'DEe2NZ5dAXGxC7M8Gs9Esd9wZRPdQzG8jNamXqhL5yku',
    'SDK 提供的 Reserve Farm State'
  );
  
  // UserState 账户本身
  await checkAccount(
    connection,
    'HtN9eg6qmjPdoRAWXAdMhGe6BJNDDTynGBPvBj2mzEW7',
    'Vault UserState 账户'
  );
  
  await checkAccount(
    connection,
    '2gYh4BrV4ghR6ByvNnLpLDfWqkfgWqA8DFVWzxKQYkZN',
    'Reserve UserState 账户'
  );
  
  console.log('\n✅ 检查完成\n');
}

main().catch(console.error);
