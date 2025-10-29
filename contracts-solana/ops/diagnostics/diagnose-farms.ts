/**
 * 诊断脚本：检查用户所有 Farm 的 UserState 状态
 * 找出为什么某些 Farm 无法领取奖励
 */

import { PublicKey, Keypair } from '@solana/web3.js';
import fs from 'fs';

// 配置
const RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3';
const VAULT_ADDRESS = new PublicKey('A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK');
const WALLET_PATH = '../../phantom-wallet.json';

async function diagnoseFarms() {
  console.log('🔍 开始诊断 Farm 状态...\n');
  
  // 加载钱包
  const walletData = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  const userPublicKey = wallet.publicKey;
  
  console.log(`👛 用户钱包: ${userPublicKey.toBase58()}\n`);
  
  // 导入 SDK Helper
  const { KaminoSDKHelper } = await import('../frontend/src/services/kaminoSdkHelper.js');
  
  const sdkHelper = new KaminoSDKHelper(RPC_URL, userPublicKey);
  await sdkHelper.initialize();
  
  console.log('✅ Kamino SDK 初始化完成\n');
  console.log('='.repeat(80));
  
  // 获取 pending rewards
  console.log('\n💰 检查 Pending Rewards...\n');
  const pendingRewards = await sdkHelper.getUserPendingRewards(VAULT_ADDRESS);
  
  if (pendingRewards.size === 0) {
    console.log('❌ 没有找到任何 pending rewards');
  } else {
    for (const [mint, amount] of pendingRewards.entries()) {
      console.log(`  💵 ${mint.slice(0, 8)}... : ${amount} tokens`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  
  // 获取 claim 指令
  console.log('\n📋 检查 Claim Rewards 指令...\n');
  const claimIxs = await sdkHelper.getClaimRewardsInstructions(VAULT_ADDRESS);
  
  if (!claimIxs || claimIxs.length === 0) {
    console.log('❌ 没有生成任何 claim 指令');
  } else {
    console.log(`✅ 找到 ${claimIxs.length} 个 claim 指令`);
    
    // 分析每个指令
    for (let i = 0; i < claimIxs.length; i++) {
      const ix = claimIxs[i];
      console.log(`\n  📝 指令 ${i + 1}/${claimIxs.length}:`);
      
      // Kamino SDK 返回的指令格式可能不同
      const accounts = ix.accounts || ix.keys;
      
      if (ix.programId) {
        console.log(`     - Program: ${ix.programId.toBase58()}`);
      }
      
      if (accounts) {
        console.log(`     - 账户数量: ${accounts.length}`);
        
        // 打印关键账户
        if (accounts.length > 0) {
          const addr = accounts[0].pubkey || accounts[0].address;
          console.log(`     - Owner: ${addr.toString()}`);
        }
        if (accounts.length > 2) {
          const addr = accounts[2].pubkey || accounts[2].address;
          console.log(`     - FarmState: ${addr.toString()}`);
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ 诊断完成！');
}

diagnoseFarms().catch(error => {
  console.error('\n❌ 诊断过程中发生错误:');
  console.error(error);
  process.exit(1);
});
