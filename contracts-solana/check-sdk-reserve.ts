import { Connection, PublicKey } from '@solana/web3.js';
import { HELIUS_RPC } from './constants';

const connection = new Connection(HELIUS_RPC, 'confirmed');

async function checkSDKReserve() {
  console.log('🔍 检查 SDK 找到的 Reserve...\n');
  
  const reserve = new PublicKey('2gc9Dm1eB6UgVYFBUN9bWks6Kes9PbWSaPaa9DqyvEiN');
  const lendingMarket = new PublicKey('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF');
  
  console.log('📋 Reserve:', reserve.toBase58());
  const reserveAccount = await connection.getAccountInfo(reserve);
  if (reserveAccount) {
    console.log('   ✅ Reserve 存在');
    console.log('   Owner:', reserveAccount.owner.toBase58());
    console.log('   Data length:', reserveAccount.data.length);
  } else {
    console.log('   ❌ Reserve 不存在');
  }
  
  console.log('\n📋 Lending Market:', lendingMarket.toBase58());
  const lmAccount = await connection.getAccountInfo(lendingMarket);
  if (lmAccount) {
    console.log('   ✅ Lending Market 存在');
    console.log('   Owner:', lmAccount.owner.toBase58());
  } else {
    console.log('   ❌ Lending Market 不存在');
  }
  
  console.log('\n💡 SDK 使用了不同的逻辑！');
  console.log('   SDK 不是从 VaultAllocationStrategy 读取');
  console.log('   而是动态查询当前有资金的 reserves');
}

checkSDKReserve().catch(console.error);
