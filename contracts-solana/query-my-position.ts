import {
  createDefaultRpcTransport,
  createRpc,
  createSolanaRpcApi,
  Rpc,
  SolanaRpcApi,
} from "@solana/kit";
import {
  getMedianSlotDurationInMsFromLastEpochs,
  KaminoManager,
  KaminoVault,
} from "@kamino-finance/klend-sdk";
import { Farms } from "@kamino-finance/farms-sdk";
import { Decimal } from "decimal.js";
import { HELIUS_RPC } from "./constants";

// 可以通过命令行参数传入 Vault 地址和用户地址
const VAULT_ADDRESS = process.argv[2] || "A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK";
const USER_ADDRESS = process.argv[3] || "4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w";

function initRpc(url: string): Rpc<SolanaRpcApi> {
  return createRpc({ api: createSolanaRpcApi(), transport: createDefaultRpcTransport({ url }) });
}

async function main() {
  console.log("\n🔍 Sentora PYUSD - My Position\n");

  // 连接到 Solana
  const rpc = initRpc(HELIUS_RPC);
  const slotDuration = await getMedianSlotDurationInMsFromLastEpochs();

  const kaminoManager = new KaminoManager(rpc, slotDuration);
  const vault = new KaminoVault(VAULT_ADDRESS as any);
  const vaultState = await vault.getState(rpc);

  // 获取用户在特定 Vault 的份额（使用 SingleVault 方法避免查询所有 vaults）
  const userSharesForVault = await kaminoManager.getUserSharesBalanceSingleVault(USER_ADDRESS as any, vault);
  
  if (!userSharesForVault || userSharesForVault.totalShares.isZero()) {
    console.log("❌ 用户在该 Vault 中没有持仓\n");
    return;
  }

  // 获取 Vault 信息和价格
  const tokenPrice = new Decimal(1.0); // PYUSD 价格约为 $1
  const vaultOverview = await kaminoManager.getVaultOverview(vaultState, tokenPrice);
  
  // 计算关键指标
  const userSharesNum = userSharesForVault.totalShares.toNumber();
  const totalSuppliedUSD = userSharesNum * tokenPrice.toNumber();
  
  // 获取 APY 分解
  const currentSlot = await rpc.getSlot({ commitment: 'confirmed' }).send();
  const reservesOverview = await kaminoManager.getVaultReservesDetails(vaultState, currentSlot);
  
  // 计算加权 Lending APY (基础利率)
  let weightedLendingAPY = new Decimal(0);
  let totalSupplied = new Decimal(0);
  
  reservesOverview.forEach((reserveDetail) => {
    const supplied = reserveDetail.suppliedAmount;
    totalSupplied = totalSupplied.add(supplied);
    weightedLendingAPY = weightedLendingAPY.add(reserveDetail.supplyAPY.mul(supplied));
  });
  
  const lendingAPY = totalSupplied.gt(0) ? weightedLendingAPY.div(totalSupplied).toNumber() : 0;
  
  // 获取 Vault Farm Rewards 和 Reserve Farm Rewards (并行优化)
  const farmsClient = new Farms(rpc);
  
  // 并行获取 vault farm rewards 和所有 reserve farm rewards
  const [vaultFarmRewards, ...reserveIncentivesArray] = await Promise.all([
    // 1. Vault Farm Rewards (直接附加到 vault 的 rewards)
    kaminoManager.getVaultFarmRewardsAPY(vault, tokenPrice, farmsClient, currentSlot),
    
    // 2. Reserve Farm Rewards (并行获取所有 reserves)
    ...Array.from(reservesOverview.keys()).map(reservePubkey =>
      kaminoManager.getReserveFarmRewardsAPY(
        reservePubkey,
        tokenPrice,
        farmsClient,
        currentSlot
      )
    )
  ]);
  
  // 处理 reserve farm rewards
  const allRewardsStats: any[] = [...vaultFarmRewards.incentivesStats];
  let totalReserveFarmAPY = 0;
  
  let reserveIndex = 0;
  for (const [reservePubkey, reserveDetail] of reservesOverview.entries()) {
    const reserveIncentives = reserveIncentivesArray[reserveIndex++];
    
    // 加权 reserve farm rewards by allocation
    const reserveAllocation = reserveDetail.suppliedAmount.div(totalSupplied);
    const weightedReserveFarmAPY = reserveIncentives.collateralFarmIncentives.totalIncentivesApy * reserveAllocation.toNumber();
    totalReserveFarmAPY += weightedReserveFarmAPY;
    
    // 添加 reserve rewards 到列表
    reserveIncentives.collateralFarmIncentives.incentivesStats.forEach(stat => {
      allRewardsStats.push({
        ...stat,
        incentivesApy: stat.incentivesApy * reserveAllocation.toNumber()
      });
    });
  }
  
  const totalIncentivesAPY = vaultFarmRewards.totalIncentivesApy + totalReserveFarmAPY;
  const totalCombinedAPY = lendingAPY + totalIncentivesAPY;
  
  // 计算每日利息 (基于 lending APY)
  const dailyInterestRate = lendingAPY / 365;
  const dailyInterestShares = userSharesNum * dailyInterestRate;
  const dailyInterestUSD = dailyInterestShares * tokenPrice.toNumber();
  
  // 输出 Kamino 风格的信息
  console.log("┌───────────────────────────────────────────────────┐");
  console.log(`│  💰 Total Supplied           $${totalSuppliedUSD.toFixed(2).padStart(10)}       │`);
  console.log(`│  💵 Daily Interest           $${dailyInterestUSD.toFixed(2).padStart(10)}       │`);
  console.log("├───────────────────────────────────────────────────┤");
  console.log(`│  📊 Lending APY               ${(lendingAPY * 100).toFixed(2).padStart(7)}%      │`);
  
  // 显示每个 incentive (不合并，显示所有单独的 rewards)
  console.log(`│  🎁 Rewards & Incentives:                         │`);
  const activeRewards = allRewardsStats.filter(r => r.incentivesApy > 0);
  
  if (activeRewards.length > 0) {
    activeRewards.forEach((incentive, idx) => {
      const rewardAPY = incentive.incentivesApy * 100;
      const weeklyRewards = incentive.weeklyRewards.toNumber();
      const weeklyK = (weeklyRewards / 1000).toFixed(2);
      const rewardMint = incentive.rewardMint.toString();
      
      // 识别 token (KMNO vs PYUSD)
      let tokenName = "TOKEN";
      if (rewardMint === "KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS") {
        tokenName = "KMNO ";
      } else if (rewardMint === "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo") {
        tokenName = "PYUSD";
      } else {
        tokenName = rewardMint.slice(0, 5);
      }
      
      console.log(`│   ${idx + 1}. ${tokenName}  ${weeklyK.padStart(7)}K/week  ${rewardAPY.toFixed(2).padStart(5)}%  │`);
    });
    
    console.log(`│                                                   │`);
    console.log(`│  Total Incentives APY: ${(totalIncentivesAPY * 100).toFixed(2)}%              │`);
  } else {
    console.log(`│     No active rewards                             │`);
  }
  
  console.log("├───────────────────────────────────────────────────┤");
  console.log(`│  📈 Total Combined APY       ${(totalCombinedAPY * 100).toFixed(2).padStart(7)}%      │`);
  console.log("└───────────────────────────────────────────────────┘\n");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
