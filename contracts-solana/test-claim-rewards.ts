/**
 * 测试脚本：验证 Claim Rewards 交易构建
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import fs from 'fs';

// 配置
const RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3';
const VAULT_ADDRESS = new PublicKey('A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK');
const WALLET_PATH = './phantom-wallet.json';

async function testClaimRewards() {
  console.log('🧪 开始测试 Claim Rewards 交易构建...\n');
  
  // 加载钱包
  const walletData = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  const userPublicKey = wallet.publicKey;
  
  console.log(`👛 用户钱包: ${userPublicKey.toBase58()}\n`);
  
  // 创建 Connection
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // 导入服务
  const { KaminoSDKHelper } = await import('../frontend/src/services/kaminoSdkHelper.js');
  const { createClaimRewardsTransaction } = await import('../frontend/src/services/marsContract.js');
  
  // 初始化 SDK Helper
  const sdkHelper = new KaminoSDKHelper(RPC_URL, userPublicKey);
  await sdkHelper.initialize();
  
  console.log('✅ Kamino SDK 初始化完成\n');
  console.log('='.repeat(80));
  
  // 构建 Claim Rewards 交易
  console.log('\n🏗️  构建 Claim Rewards 交易...\n');
  
  try {
    const claimTx = await createClaimRewardsTransaction(userPublicKey, connection, sdkHelper);
    
    if (!claimTx) {
      console.log('❌ 没有构建出交易（可能没有可领取的奖励）');
    } else {
      console.log('\n✅ Claim Rewards 交易构建成功！');
      console.log(`   - 指令数量: ${claimTx.instructions.length}`);
      console.log(`   - Compute Unit Limit: 已设置`);
      console.log(`   - Recent Blockhash: ${claimTx.recentBlockhash?.slice(0, 8)}...`);
      
      // 打印指令详情
      console.log('\n📋 交易指令详情:');
      claimTx.instructions.forEach((ix, idx) => {
        console.log(`   ${idx + 1}. Program: ${ix.programId.toBase58().slice(0, 8)}...`);
        console.log(`      账户数: ${ix.keys.length}, 数据长度: ${ix.data.length} bytes`);
      });
    }
  } catch (error: any) {
    console.error('\n❌ 构建交易失败:');
    console.error(error);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ 测试完成！');
}

testClaimRewards().catch(error => {
  console.error('\n❌ 测试过程中发生错误:');
  console.error(error);
  process.exit(1);
});
