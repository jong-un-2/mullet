/**
 * Vault Historical Data Collector
 * 定时记录 Kamino Vault 的 APY 和 TVL 数据到 PostgreSQL
 * 
 * 这个脚本会：
 * 1. 连接到 Solana RPC
 * 2. 从 Kamino SDK 直接获取 Vault 的当前 APY 和 TVL
 * 3. 保存到 PostgreSQL vault_historical_data 表
 * 
 * 支持两种运行模式：
 * 1. Cloudflare Workers Cron (生产环境)
 * 2. Node.js Script (本地测试)
 */

import { neon } from '@neondatabase/serverless';
import Decimal from 'decimal.js';
import {
  getMedianSlotDurationInMsFromLastEpochs,
  KaminoManager,
  KaminoVault,
} from '@kamino-finance/klend-sdk';
import { Farms } from '@kamino-finance/farms-sdk';
import {
  createDefaultRpcTransport,
  createRpc,
  createSolanaRpcApi,
  type Address,
} from '@solana/kit';

// Vault 配置
const PYUSD_VAULT_ADDRESS = 'A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK';

// Neon 数据库连接字符串  
const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL || 
  'postgresql://neondb_owner:npg_pVUqHYdcGR4j@ep-late-sound-a1w6j92o.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

// Solana RPC URL
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 
  'https://rpc.ankr.com/solana/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3';

interface VaultSnapshot {
  vaultAddress: string;
  recordedAt: Date;
  lendingApy: number;
  incentivesApy: number;
  totalApy: number;
  totalSupplied: number;
  totalSuppliedUsd: number;
  tokenSymbol: string;
  slotNumber?: number;
  metadata?: any;
}

/**
 * 从 Kamino Vault 获取当前数据
 * 直接使用 Kamino SDK 从链上获取实时数据
 * 
 * @param vaultAddress - Vault 地址
 * @param rpcUrl - Solana RPC URL (可选)
 */
export async function fetchVaultData(
  vaultAddress: string,
  rpcUrl?: string
): Promise<VaultSnapshot> {
  console.log('📊 Fetching vault data from Solana blockchain:', vaultAddress);

  const rpc_url = rpcUrl || SOLANA_RPC_URL;
  
  try {
    // 1. 创建 RPC 连接
    const transport = createDefaultRpcTransport({ url: rpc_url });
    const rpc = createRpc({ api: createSolanaRpcApi(), transport });

    // 2. 获取 slot duration
    const slotDuration = await getMedianSlotDurationInMsFromLastEpochs();
    
    // 3. 创建 KaminoManager 和 Farms 客户端
    const kaminoManager = new KaminoManager(rpc, slotDuration);
    const farmsClient = new Farms(rpc);

    // 4. 加载 Vault 状态
    const vault = new KaminoVault(rpc, vaultAddress as Address);
    const vaultState = await vault.getState();

    // 5. 获取当前 slot
    const currentSlot = await rpc.getSlot({ commitment: 'confirmed' }).send();

    // 6. 获取 Holdings (TVL)
    const tokenPrice = new Decimal(1.0); // PYUSD = $1
    const holdingsInUSD: any = await kaminoManager.getVaultHoldingsWithPrice(vault.state!, tokenPrice);
    
    const totalSuppliedUsd = holdingsInUSD.totalUSDIncludingFees 
      ? holdingsInUSD.totalUSDIncludingFees.toNumber()
      : (holdingsInUSD.available?.toNumber() || 0) + (holdingsInUSD.invested?.toNumber() || 0);

    // 7. 获取 reserves 详情来计算 Lending APY
    const reservesOverview = await kaminoManager.getVaultReservesDetails(vault.state!, currentSlot);
    
    let weightedLendingAPY = new Decimal(0);
    let totalSupplied = new Decimal(0);
    
    reservesOverview.forEach((reserveDetail: any) => {
      const supplied = reserveDetail.suppliedAmount;
      totalSupplied = totalSupplied.add(supplied);
      weightedLendingAPY = weightedLendingAPY.add(reserveDetail.supplyAPY.mul(supplied));
    });
    
    const lendingAPY = totalSupplied.gt(0) ? weightedLendingAPY.div(totalSupplied).toNumber() : 0;

    // 8. 获取 Vault Farm Rewards 和 Reserve Farm Rewards
    const [vaultFarmRewards, ...reserveIncentivesArray] = await Promise.all([
      kaminoManager.getVaultFarmRewardsAPY(vault, tokenPrice, farmsClient, currentSlot),
      ...Array.from(reservesOverview.keys()).map((reservePubkey: any) =>
        kaminoManager.getReserveFarmRewardsAPY(reservePubkey, tokenPrice, farmsClient, currentSlot)
      )
    ]);
    
    // 9. 计算 Reserve Farm APY
    let totalReserveFarmAPY = 0;
    let reserveIndex = 0;
    
    for (const [reservePubkey, reserveDetail] of reservesOverview.entries()) {
      const reserveIncentives: any = reserveIncentivesArray[reserveIndex++];
      const reserveAllocation = (reserveDetail as any).suppliedAmount.div(totalSupplied);
      const weightedReserveFarmAPY = reserveIncentives.collateralFarmIncentives.totalIncentivesApy * reserveAllocation.toNumber();
      totalReserveFarmAPY += weightedReserveFarmAPY;
    }
    
    // 10. 计算总的 Incentives APY 和 Total APY
    const totalIncentivesAPY = vaultFarmRewards.totalIncentivesApy + totalReserveFarmAPY;
    const totalAPY = lendingAPY + totalIncentivesAPY;

    console.log(`✅ Vault data fetched: APY ${(totalAPY * 100).toFixed(2)}% (Lending: ${(lendingAPY * 100).toFixed(2)}%, Incentives: ${(totalIncentivesAPY * 100).toFixed(2)}%), TVL: $${(totalSuppliedUsd / 1_000_000).toFixed(2)}M`);

    return {
      vaultAddress,
      recordedAt: new Date(),
      lendingApy: lendingAPY,
      incentivesApy: totalIncentivesAPY,
      totalApy: totalAPY,
      totalSupplied: totalSuppliedUsd,
      totalSuppliedUsd: totalSuppliedUsd,
      tokenSymbol: 'PYUSD',
      slotNumber: Number(currentSlot),
      metadata: {
        source: 'kamino-sdk-direct',
        vaultFarmAPY: vaultFarmRewards.totalIncentivesApy,
        reserveFarmAPY: totalReserveFarmAPY,
        utilization: (holdingsInUSD.totalUSDIncludingFees ? 
          (holdingsInUSD.invested?.toNumber() || 0) / holdingsInUSD.totalUSDIncludingFees.toNumber() : 0),
      }
    };
  } catch (error) {
    console.error('❌ Failed to fetch from Kamino SDK:', error);
    throw error;
  }
}

/**
 * 保存 Vault 快照到数据库
 * 
 * @param snapshot - Vault 快照数据
 * @param connectionString - 数据库连接字符串（可选，如果提供则使用，否则使用环境变量）
 */
export async function saveVaultSnapshot(
  snapshot: VaultSnapshot, 
  connectionString?: string
): Promise<void> {
  const dbUrl = connectionString || NEON_DATABASE_URL;
  const sql = neon(dbUrl);

  const result = await sql`
    INSERT INTO vault_historical_data (
      vault_address,
      recorded_at,
      lending_apy,
      incentives_apy,
      total_apy,
      total_supplied,
      total_supplied_usd,
      token_symbol,
      slot_number,
      metadata
    ) VALUES (
      ${snapshot.vaultAddress},
      ${snapshot.recordedAt.toISOString()},
      ${snapshot.lendingApy},
      ${snapshot.incentivesApy},
      ${snapshot.totalApy},
      ${snapshot.totalSupplied},
      ${snapshot.totalSuppliedUsd},
      ${snapshot.tokenSymbol},
      ${snapshot.slotNumber || null},
      ${JSON.stringify(snapshot.metadata || {})}
    )
    RETURNING id, recorded_at;
  `;

  console.log('✅ Vault snapshot saved:', result[0]);
}

/**
 * 主函数：收集并保存 Vault 数据
 * 
 * @param rpcUrl - Solana RPC URL (可选，用于 Workers cron)
 * @param dbConnectionString - 数据库连接字符串 (可选，用于 Workers Hyperdrive)
 * @returns 收集结果统计
 */
export async function collectVaultHistoricalData(
  rpcUrl?: string,
  dbConnectionString?: string
): Promise<{
  success: boolean;
  duration: number;
  snapshot?: VaultSnapshot;
  error?: string;
}> {
  const startTime = Date.now();
  console.log('🚀 Starting vault data collection at', new Date().toISOString());

  try {
    // 获取 Vault 数据（直接从链上通过 Kamino SDK）
    const snapshot = await fetchVaultData(PYUSD_VAULT_ADDRESS, rpcUrl);

    console.log('📈 Vault Snapshot:', {
      totalApy: `${(snapshot.totalApy * 100).toFixed(2)}%`,
      lendingApy: `${(snapshot.lendingApy * 100).toFixed(2)}%`,
      incentivesApy: `${(snapshot.incentivesApy * 100).toFixed(2)}%`,
      tvl: `$${snapshot.totalSuppliedUsd.toLocaleString()}`,
    });

    // 保存到数据库
    await saveVaultSnapshot(snapshot, dbConnectionString);

    const duration = Date.now() - startTime;
    console.log(`✅ Vault data collection completed in ${duration}ms`);
    
    return {
      success: true,
      duration,
      snapshot,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to collect vault data:', error);
    
    return {
      success: false,
      duration,
      error: errorMessage,
    };
  }
}

// Note: If you want to run this directly in Node.js for testing,
// use the script in scripts/collect-vault-data.js instead
