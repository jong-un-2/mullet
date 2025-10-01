import { Connection, PublicKey, AddressLookupTableAccount } from '@solana/web3.js';
import { HELIUS_RPC } from './constants';

const connection = new Connection(HELIUS_RPC, 'confirmed');
const VAULT = new PublicKey('A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK');

async function checkVaultLUT() {
  console.log('🔍 检查 Vault 的 Address Lookup Table...\n');
  
  const vaultAccount = await connection.getAccountInfo(VAULT);
  if (!vaultAccount) {
    console.log('❌ Vault 不存在');
    return;
  }
  
  const data = vaultAccount.data;
  
  // VaultState structure:
  // discriminator(8) + vaultAdminAuthority(32) + baseVaultAuthority(32) + baseVaultAuthorityBump(8) + 
  // tokenMint(32) + tokenMintDecimals(8) + tokenVault(32) + tokenProgram(32) + sharesMint(32) + 
  // sharesMintDecimals(8) + tokenAvailable(8) + sharesIssued(8) + availableCrankFunds(8) +
  // unallocatedWeight(8) + performanceFeeBps(8) + managementFeeBps(8) + lastFeeChargeTimestamp(8) +
  // prevAumSf(16) + pendingFeesSf(16) + vaultAllocationStrategy[25](2000) + padding1(4096) +
  // minDepositAmount(8) + minWithdrawAmount(8) + minInvestAmount(8) + minInvestDelaySlots(8) +
  // crankFundFeePerReserve(8) + pendingAdmin(32) + cumulativeEarnedInterestSf(16) +
  // cumulativeMgmtFeesSf(16) + cumulativePerfFeesSf(16) + name(32) + vaultLookupTable(32)
  
  // Calculate offset to vaultLookupTable
  // 8 + 32*3 + 8 + 32 + 8 + 32*3 + 8*10 + 16*2 + 2000 + 4096 + 8*5 + 32 + 16*3 + 32 = ?
  // Let's read from a known position based on IDL
  
  // According to IDL order, vaultLookupTable comes after name
  // Let's search for it systematically
  
  let offset = 8; // discriminator
  offset += 32; // vaultAdminAuthority
  offset += 32; // baseVaultAuthority
  offset += 8;  // baseVaultAuthorityBump
  offset += 32; // tokenMint
  offset += 8;  // tokenMintDecimals
  offset += 32; // tokenVault
  offset += 32; // tokenProgram
  offset += 32; // sharesMint
  offset += 8;  // sharesMintDecimals
  offset += 8;  // tokenAvailable
  offset += 8;  // sharesIssued
  offset += 8;  // availableCrankFunds
  offset += 8;  // unallocatedWeight
  offset += 8;  // performanceFeeBps
  offset += 8;  // managementFeeBps
  offset += 8;  // lastFeeChargeTimestamp
  offset += 16; // prevAumSf
  offset += 16; // pendingFeesSf
  offset += 2000; // vaultAllocationStrategy [VaultAllocation; 25] * 80
  offset += 4096; // padding1 [u128; 256] * 16
  offset += 8;  // minDepositAmount
  offset += 8;  // minWithdrawAmount
  offset += 8;  // minInvestAmount
  offset += 8;  // minInvestDelaySlots
  offset += 8;  // crankFundFeePerReserve
  offset += 32; // pendingAdmin
  offset += 16; // cumulativeEarnedInterestSf
  offset += 16; // cumulativeMgmtFeesSf
  offset += 16; // cumulativePerfFeesSf
  offset += 32; // name
  
  // Now at vaultLookupTable
  const vaultLookupTable = new PublicKey(data.slice(offset, offset + 32));
  
  console.log('📋 Vault Lookup Table:', vaultLookupTable.toBase58());
  console.log('   Default?', vaultLookupTable.equals(PublicKey.default));
  
  if (!vaultLookupTable.equals(PublicKey.default)) {
    console.log('\n🔍 获取 LUT 内容...');
    
    const lutAccount = await connection.getAccountInfo(vaultLookupTable);
    if (lutAccount) {
      console.log('  ✅ LUT 账户存在');
      console.log('  Data length:', lutAccount.data.length);
      
      // Parse LUT
      try {
        const lookupTableAccount = await connection.getAddressLookupTable(vaultLookupTable);
        if (lookupTableAccount.value) {
          console.log('\n📋 LUT 包含的账户:');
          lookupTableAccount.value.state.addresses.forEach((addr, i) => {
            console.log(`  ${i}: ${addr.toBase58()}`);
          });
          
          console.log(`\n✅ 总共 ${lookupTableAccount.value.state.addresses.length} 个账户在 LUT 中`);
          console.log('\n💡 这些账户可能包括:');
          console.log('   - Vault reserves');
          console.log('   - Lending markets');
          console.log('   - 其他 Kamino 需要的账户');
        }
      } catch (e: any) {
        console.log('  ❌ 解析 LUT 失败:', e.message);
      }
    } else {
      console.log('  ❌ LUT 账户不存在');
    }
  } else {
    console.log('  ℹ️  此 vault 没有配置 LUT');
  }
}

checkVaultLUT().catch(console.error);
