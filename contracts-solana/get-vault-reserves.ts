import { Connection, PublicKey } from '@solana/web3.js';
import { HELIUS_RPC } from './constants';

const connection = new Connection(HELIUS_RPC, 'confirmed');
const VAULT = new PublicKey('A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK');
const KLEND_PROGRAM = new PublicKey('KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD');

async function getVaultReserves() {
  console.log('🔍 获取 Vault Reserves...\n');
  
  const vaultAccount = await connection.getAccountInfo(VAULT);
  if (!vaultAccount) {
    console.log('❌ Vault 不存在');
    return;
  }
  
  const data = vaultAccount.data;
  
  // VaultAllocationStrategy starts after initial fields
  // Based on VaultState structure from IDL:
  // discriminator(8) + vaultAdminAuthority(32) + baseVaultAuthority(32) + baseVaultAuthorityBump(8) + 
  // tokenMint(32) + tokenMintDecimals(8) + tokenVault(32) + tokenProgram(32) + sharesMint(32) + 
  // sharesMintDecimals(8) + vaultLookupTable(32) + vaultFarm(32) + pendingAdmin(32) + totalShares(16) +
  // lastUpdateTimestamp(8) + vaultAvailable(16) + reserved(128) = ~440 bytes before vaultAllocationStrategy
  
  // vaultAllocationStrategy is a Vec<VaultAllocationStrategy>
  // First check the length at offset ~440
  let offset = 440;
  const vecLength = data.readUInt32LE(offset);
  console.log(`📋 VaultAllocationStrategy 数量: ${vecLength}\n`);
  
  offset += 4;
  
  const reserves: PublicKey[] = [];
  for (let i = 0; i < vecLength; i++) {
    // VaultAllocationStrategy structure:
    // reserve: Pubkey (32 bytes)
    // allocationCap: u128 (16 bytes)
    const reserve = new PublicKey(data.slice(offset, offset + 32));
    
    // Check if reserve is not default (all zeros)
    const isDefault = reserve.equals(PublicKey.default);
    
    if (!isDefault) {
      reserves.push(reserve);
      console.log(`  Reserve ${i}: ${reserve.toBase58()}`);
    }
    
    offset += 32 + 16; // reserve + allocationCap
  }
  
  console.log(`\n✅ 找到 ${reserves.length} 个 reserves\n`);
  
  // Now get the lending market for each reserve
  console.log('📋 获取每个 Reserve 的 Lending Market:\n');
  
  for (const reserve of reserves) {
    const reserveAccount = await connection.getAccountInfo(reserve);
    if (!reserveAccount) {
      console.log(`  ❌ Reserve ${reserve.toBase58()} 不存在`);
      continue;
    }
    
    // Reserve structure: discriminator(8) + ... + lendingMarket at offset 10
    const lendingMarketOffset = 10;
    const lendingMarket = new PublicKey(reserveAccount.data.slice(lendingMarketOffset, lendingMarketOffset + 32));
    
    console.log(`  Reserve: ${reserve.toBase58()}`);
    console.log(`    Lending Market: ${lendingMarket.toBase58()}\n`);
  }
}

getVaultReserves();
