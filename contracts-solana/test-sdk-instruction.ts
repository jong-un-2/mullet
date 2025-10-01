import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { KaminoManager, KaminoVault } from '@kamino-finance/klend-sdk';
import Decimal from 'decimal.js';
import * as fs from 'fs';
import { HELIUS_RPC, KAMINO_V2_PROGRAM } from './constants';

const connection = new Connection(HELIUS_RPC, 'confirmed');

async function inspectSDKInstruction() {
  console.log('🔍 检查 SDK 构造的指令...\n');
  
  // Load wallet
  const walletPath = '/Users/joung-un/mars-projects/wallet-config/solana-wallet.json';
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
  
  const user = {
    address: wallet.publicKey,
    signTransaction: async (tx: any) => {
      tx.sign([wallet]);
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      txs.forEach(tx => tx.sign([wallet]));
      return txs;
    }
  };
  
  // Using the PYUSD vault
  const VAULT_ADDRESS = new PublicKey('A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK');
  const vault = new KaminoVault(VAULT_ADDRESS);
  
  // Get slot duration (required by SDK)
  const slotDuration = 400; // 400ms default
  const kaminoManager = new KaminoManager(connection, slotDuration);
  
  // Request deposit of 5 PYUSD
  const depositAmount = new Decimal(5.0);
  
  console.log('📋 调用 SDK depositToVaultIxs...\n');
  
  try {
    const depositIx = await kaminoManager.depositToVaultIxs(user, vault, depositAmount);
    
    console.log('✅ SDK 返回的指令:\n');
    console.log(`📦 Deposit Instructions: ${depositIx.depositIxs.length} 个`);
    console.log(`📦 Stake Instructions: ${depositIx.stakeInFarmIfNeededIxs.length} 个\n`);
    
    // Inspect each deposit instruction
    depositIx.depositIxs.forEach((ix, idx) => {
      console.log(`\n📋 Instruction ${idx + 1}:`);
      console.log(`   Program ID: ${ix.programId?.toBase58()}`);
      console.log(`   Accounts: ${ix.keys?.length || 0} 个`);
      
      if (ix.keys) {
        console.log(`\n   账户列表:`);
        ix.keys.forEach((key, i) => {
          const role = key.isWritable ? (key.isSigner ? 'signer+writable' : 'writable') : (key.isSigner ? 'signer' : 'readonly');
          console.log(`     ${i}: ${key.pubkey.toBase58()} [${role}]`);
        });
      }
      
      if (ix.data) {
        console.log(`\n   Data: ${ix.data.length} bytes`);
        console.log(`   Data (hex): ${ix.data.toString('hex').substring(0, 40)}...`);
      }
    });
    
    // Find the main deposit instruction (should be from Kamino program)
    const kaminoDepositIx = depositIx.depositIxs.find(ix => 
      ix.programId?.equals(new PublicKey(KAMINO_V2_PROGRAM))
    );
    
    if (kaminoDepositIx) {
      console.log('\n\n🎯 找到 Kamino Deposit 指令!');
      console.log('   Program: Kamino V2');
      console.log(`   Accounts: ${kaminoDepositIx.keys?.length || 0} 个`);
      console.log(`   Base accounts: 13 个 (固定)`);
      console.log(`   Remaining accounts: ${(kaminoDepositIx.keys?.length || 0) - 13} 个`);
      
      if (kaminoDepositIx.keys && kaminoDepositIx.keys.length > 13) {
        console.log('\n   📋 Remaining Accounts (reserves + lending markets):');
        const remainingAccounts = kaminoDepositIx.keys.slice(13);
        remainingAccounts.forEach((key, i) => {
          const role = key.isWritable ? 'writable' : 'readonly';
          console.log(`     ${i}: ${key.pubkey.toBase58()} [${role}]`);
        });
        
        // Analyze pattern
        const halfPoint = remainingAccounts.length / 2;
        console.log(`\n   💡 分析: 前 ${halfPoint} 个应该是 reserves (writable)`);
        console.log(`           后 ${halfPoint} 个应该是 lending markets (readonly)`);
      }
    }
    
    console.log('\n\n💡 方案:');
    console.log('1. 用 SDK 构造完整指令 (包含 remaining_accounts)');
    console.log('2. 提取账户列表和 data');
    console.log('3. 构造调用 Mars 合约的指令，传入这些账户');
    console.log('4. Mars 合约再 CPI 到 Kamino');
    
  } catch (e: any) {
    console.log('❌ SDK 调用失败:', e.message);
    if (e.logs) {
      console.log('\n交易日志:');
      e.logs.forEach((log: string) => console.log('  ', log));
    }
  }
}

inspectSDKInstruction().catch(console.error);
