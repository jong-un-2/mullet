/**
 * 测试 Kamino SDK 获取 Vault APY 和 TVL
 * 基于 klend-sdk/examples/kvault/example_get_vault_info.ts
 */

import Decimal from 'decimal.js';
import {
  getMedianSlotDurationInMsFromLastEpochs,
  KaminoManager,
  KaminoVault,
} from '@kamino-finance/klend-sdk';
import {
  createDefaultRpcTransport,
  createRpc,
  createSolanaRpcApi,
} from '@solana/kit';

// PYUSD Vault 地址
const PYUSD_VAULT_ADDRESS = 'A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK';

// Solana RPC URL - 使用 Helius 提高速度
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3';

async function testKaminoSDK() {
  console.log('🚀 开始测试 Kamino SDK...\n');

  // 1. 创建 RPC 连接
  console.log('📡 连接到 Solana RPC:', RPC_URL);
  const transport = createDefaultRpcTransport({ url: RPC_URL });
  const rpc = createRpc({ api: createSolanaRpcApi(), transport });

  // 2. 获取 slot duration
  console.log('⏱️  获取 slot duration...');
  const slotDuration = await getMedianSlotDurationInMsFromLastEpochs();
  console.log(`   Slot duration: ${slotDuration}ms\n`);

  // 3. 创建 KaminoManager
  console.log('🔧 创建 KaminoManager...');
  const kaminoManager = new KaminoManager(rpc, slotDuration);

  // 4. 创建 Vault 实例
  console.log('📦 加载 Vault:', PYUSD_VAULT_ADDRESS);
  const vault = new KaminoVault(PYUSD_VAULT_ADDRESS as any);
  const vaultState = await vault.getState(rpc);
  console.log('   Vault State 加载完成\n');

  // 5. 获取当前 slot
  const currentSlot = await rpc.getSlot({ commitment: 'confirmed' }).send();
  console.log('📍 当前 Slot:', currentSlot, '\n');

  // ============================================
  // 🔥 关键指标：APY
  // ============================================
  console.log('📊 获取 Vault APY...');
  const apyResult: any = await kaminoManager.getVaultTheoreticalAPY(vaultState, currentSlot);
  console.log('   APY 详情:');
  console.log(`     - Gross APY (总 APY): ${(Number(apyResult.grossAPY) * 100).toFixed(4)}%`);
  console.log(`     - Net APY (净 APY): ${(Number(apyResult.netAPY) * 100).toFixed(4)}%\n`);

  // ============================================
  // 🔥 关键指标：Holdings (TVL)
  // ============================================
  console.log('💰 获取 Vault Holdings (TVL)...');
  const holdings: any = await kaminoManager.getVaultHoldings(vaultState);
  console.log('   Holdings 原始数据:', holdings);
  
  const availableAmount = holdings.available ? new Decimal(holdings.available.toString()) : new Decimal(0);
  const investedAmount = holdings.invested ? new Decimal(holdings.invested.toString()) : new Decimal(0);
  const totalBalance = availableAmount.plus(investedAmount);
  
  console.log('   Holdings:');
  console.log(`     - Available: ${availableAmount.toString()}`);
  console.log(`     - Invested: ${investedAmount.toString()}`);
  console.log(`     - Total Balance: ${totalBalance.toString()}\n`);

  // PYUSD 是稳定币，价格约为 $1
  const tokenPrice = new Decimal(1.0);
  console.log('💵 Holdings in USD (假设 PYUSD = $1):');
  console.log(`   - Available USD: $${availableAmount.toNumber().toLocaleString()}`);
  console.log(`   - Invested USD: $${investedAmount.toNumber().toLocaleString()}`);
  console.log(`   - Total TVL: $${totalBalance.toNumber().toLocaleString()}\n`);

  // ============================================
  // 🔥 关键指标：Tokens Per Share
  // ============================================
  console.log('🪙 获取 Tokens Per Share...');
  const tokensPerShare: any = await kaminoManager.getTokensPerShareSingleVault(vault);
  console.log(`   Tokens per share: ${tokensPerShare.toString()}\n`);

  // ============================================
  // 🔥 关键指标：Total Interest Earned
  // ============================================
  console.log('💸 获取累计收益...');
  const totalInterestEarned: any = await kaminoManager.getVaultCumulativeInterest(vaultState);
  console.log(`   Total interest earned: ${totalInterestEarned.toString()}\n`);

  // ============================================
  // 📋 总结
  // ============================================
  console.log('✅ 测试完成！\n');
  console.log('========================');
  console.log('📈 关键数据总结:');
  console.log('========================');
  console.log(`Vault: ${PYUSD_VAULT_ADDRESS}`);
  console.log(`Gross APY: ${(Number(apyResult.grossAPY) * 100).toFixed(4)}%`);
  console.log(`Net APY: ${(Number(apyResult.netAPY) * 100).toFixed(4)}%`);
  console.log(`Total TVL: $${totalBalance.toNumber().toLocaleString()}`);
  console.log(`Tokens Per Share: ${tokensPerShare.toString()}`);
  console.log('========================\n');
  
  // 返回关键数据用于 collector
  return {
    grossAPY: Number(apyResult.grossAPY),
    netAPY: Number(apyResult.netAPY),
    totalSupplied: totalBalance.toNumber(),
    totalSuppliedUSD: totalBalance.toNumber(), // PYUSD = $1
    availableAmount: availableAmount.toNumber(),
    investedAmount: investedAmount.toNumber(),
    tokensPerShare: tokensPerShare.toNumber(),
  };
}

// 运行测试
testKaminoSDK()
  .then(() => {
    console.log('🎉 所有测试完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  });
