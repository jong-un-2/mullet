import { Connection, PublicKey } from '@solana/web3.js';
import { HELIUS_RPC } from './constants';

const connection = new Connection(HELIUS_RPC, 'confirmed');

async function checkReserves() {
  console.log('🔍 检查 Vault 中配置的 Reserves 是否真实存在...\n');
  
  const VAULT = new PublicKey('A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK');
  const vaultAccount = await connection.getAccountInfo(VAULT);
  
  if (!vaultAccount) {
    console.log('❌ Vault不存在');
    return;
  }
  
  const data = vaultAccount.data;
  
  // Parse reserves from VaultAllocationStrategy at offset 320
  let reserveOffset = 320;
  const allocationCount = 25;
  const reserves: PublicKey[] = [];
  
  console.log('📋 扫描 VaultAllocationStrategy (25 个 slots)...\n');
  
  for (let i = 0; i < allocationCount; i++) {
    const reserve = new PublicKey(data.slice(reserveOffset, reserveOffset + 32));
    if (!reserve.equals(PublicKey.default)) {
      reserves.push(reserve);
      console.log(`  Slot ${i}: ${reserve.toBase58()}`);
    }
    reserveOffset += 80; // Each VaultAllocation is 80 bytes
  }
  
  console.log(`\n找到 ${reserves.length} 个非空 reserves\n`);
  
  // Check if reserves exist on-chain
  console.log('🔍 检查这些 reserves 是否真实存在...\n');
  
  const reserveAccounts = await connection.getMultipleAccountsInfo(reserves);
  
  for (let i = 0; i < reserves.length; i++) {
    const reserveAccount = reserveAccounts[i];
    console.log(`📋 Reserve ${i + 1}: ${reserves[i].toBase58()}`);
    
    if (reserveAccount === null) {
      console.log(`   ❌ 账户不存在\n`);
    } else {
      console.log(`   ✅ 账户存在`);
      console.log(`   Owner: ${reserveAccount.owner.toBase58()}`);
      console.log(`   Data length: ${reserveAccount.data.length} bytes`);
      console.log(`   Lamports: ${reserveAccount.lamports}`);
      
      // Try to parse lending market
      if (reserveAccount.data.length >= 48) {
        const lendingMarket = new PublicKey(reserveAccount.data.slice(16, 48));
        console.log(`   Lending Market: ${lendingMarket.toBase58()}`);
        
        // Check if lending market exists
        const lmAccount = await connection.getAccountInfo(lendingMarket);
        if (lmAccount) {
          console.log(`   ✅ Lending Market 存在\n`);
        } else {
          console.log(`   ❌ Lending Market 不存在\n`);
        }
      } else {
        console.log(`   ⚠️  数据太短，无法解析\n`);
      }
    }
  }
  
  console.log('\n💡 结论:');
  console.log('如果 reserves 不存在，说明此 vault 配置有问题');
  console.log('需要找到一个有效的 PYUSD vault 或者先用 USDC 测试');
}

checkReserves().catch(console.error);
