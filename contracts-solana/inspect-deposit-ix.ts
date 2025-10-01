import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { KaminoManager, KaminoVault } from '@kamino-finance/klend-sdk';
import { HELIUS_RPC } from './constants';
import * as fs from 'fs';
import Decimal from 'decimal.js';

const connection = new Connection(HELIUS_RPC, 'confirmed');
const VAULT_ADDRESS = new PublicKey('A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK');

async function inspectDepositIx() {
  console.log('🔍 检查 Kamino Deposit 指令结构...\n');
  
  const wallet = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('./user.json', 'utf8')))
  );
  
  // 创建 TransactionSigner 对象
  const user = {
    address: wallet.publicKey.toBase58() as any,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
    signAndSendTransactions: async (txs: any[]) => [],
  };
  
  const kaminoManager = new KaminoManager(connection as any, 100);
  const vault = new KaminoVault(VAULT_ADDRESS.toBase58() as any);
  
  const vaultState = await vault.getState(connection as any);
  
  console.log('📋 Vault State:');
  console.log('  tokenMint:', vaultState.tokenMint);
  console.log('  tokenVault:', vaultState.tokenVault);
  console.log('  sharesMint:', vaultState.sharesMint);
  console.log('  baseVaultAuthority:', vaultState.baseVaultAuthority);
  console.log('  tokenProgram:', vaultState.tokenProgram);
  console.log('  vaultLookupTable:', vaultState.vaultLookupTable);
  console.log('');
  
  // 获取 deposit 指令
  const depositAmount = new Decimal(5.0);
  const depositIxs = await kaminoManager.depositToVaultIxs(user, vault, depositAmount);
  
  console.log('📋 Deposit Instructions:');
  console.log(`  总共 ${depositIxs.depositIxs.length} 条指令\n`);
  
  depositIxs.depositIxs.forEach((ix: any, i: number) => {
    console.log(`\n指令 ${i}:`);
    console.log('  programId:', ix.programId?.toString() || 'N/A');
    console.log('  账户数量:', ix.accounts?.length || 0);
    
    if (ix.accounts && ix.accounts.length > 0) {
      console.log('\n  账户列表:');
      ix.accounts.forEach((acc: any, j: number) => {
        const role = acc.role === 1 ? 'writable' : acc.role === 2 ? 'signer' : 'readonly';
        console.log(`    ${j}: ${acc.address} (${role})`);
      });
    }
  });
  
  console.log('\n\n🎯 关键发现:');
  console.log('-----------------------------------');
  const mainDepositIx = depositIxs.depositIxs.find((ix: any) => 
    ix.programId?.toString() === 'KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd'
  );
  
  if (mainDepositIx && mainDepositIx.accounts) {
    console.log(`\nKamino deposit 指令有 ${mainDepositIx.accounts.length} 个账户:`);
    console.log('前 13 个是基础账户，后面的是 remaining_accounts (reserves + lending markets)\n');
    
    if (mainDepositIx.accounts.length > 13) {
      console.log('Remaining Accounts:');
      for (let i = 13; i < mainDepositIx.accounts.length; i++) {
        const acc: any = mainDepositIx.accounts[i];
        const role = acc.role === 1 ? 'writable' : 'readonly';
        console.log(`  ${i - 13}: ${acc.address} (${role})`);
      }
    } else {
      console.log('没有 remaining accounts - 这个 vault 可能没有 allocations');
    }
  }
  console.log('-----------------------------------\n');
}

inspectDepositIx().catch(console.error);
