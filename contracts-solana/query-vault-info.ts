import {
  createDefaultRpcTransport,
  createRpc,
  createSolanaRpcApi,
  Rpc,
  SolanaRpcApi,
} from "@solana/kit";
import Decimal from "decimal.js/decimal";
import {
  getMedianSlotDurationInMsFromLastEpochs,
  KaminoManager,
  KaminoVault,
} from "@kamino-finance/klend-sdk";
import { Farms } from "@kamino-finance/farms-sdk";
import { HELIUS_RPC } from "./constants";

// 可以通过命令行参数传入 Vault 地址
const VAULT_ADDRESS = process.argv[2] || "A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK";

function initRpc(url: string): Rpc<SolanaRpcApi> {
  return createRpc({ api: createSolanaRpcApi(), transport: createDefaultRpcTransport({ url }) });
}

async function main() {
  console.log("\n🏦 Sentora PYUSD - Vault Overview\n");

  // 连接到 Solana
  const rpc = initRpc(HELIUS_RPC);
  const slotDuration = await getMedianSlotDurationInMsFromLastEpochs();

  const kaminoManager = new KaminoManager(rpc, slotDuration);
  const vault = new KaminoVault(VAULT_ADDRESS as any);
  const vaultState = await vault.getState(rpc);

  const tokenPrice = new Decimal(1.0); // PYUSD 价格约为 $1
  const currentSlot = await rpc.getSlot({ commitment: "confirmed" }).send();

  // 获取 vault overview 数据
  const vaultOverview = await kaminoManager.getVaultOverview(vaultState, tokenPrice);
  const holdingsInUSD = await kaminoManager.getVaultHoldingsWithPrice(vaultState, tokenPrice);
  
  // 获取 reserves 详情
  const reservesOverview = await kaminoManager.getVaultReservesDetails(vaultState, currentSlot);
  
  // 计算加权 Lending APY
  let weightedLendingAPY = new Decimal(0);
  let totalSupplied = new Decimal(0);
  
  reservesOverview.forEach((reserveDetail) => {
    const supplied = reserveDetail.suppliedAmount;
    totalSupplied = totalSupplied.add(supplied);
    weightedLendingAPY = weightedLendingAPY.add(reserveDetail.supplyAPY.mul(supplied));
  });
  
  const lendingAPY = totalSupplied.gt(0) ? weightedLendingAPY.div(totalSupplied).toNumber() : 0;
  
  // 获取 Vault Farm Rewards 和 Reserve Farm Rewards
  const farmsClient = new Farms(rpc);
  const [vaultFarmRewards, ...reserveIncentivesArray] = await Promise.all([
    kaminoManager.getVaultFarmRewardsAPY(vault, tokenPrice, farmsClient, currentSlot),
    ...Array.from(reservesOverview.keys()).map(reservePubkey =>
      kaminoManager.getReserveFarmRewardsAPY(reservePubkey, tokenPrice, farmsClient, currentSlot)
    )
  ]);
  
  // 处理 reserve farm rewards
  let totalReserveFarmAPY = 0;
  let reserveIndex = 0;
  
  for (const [reservePubkey, reserveDetail] of reservesOverview.entries()) {
    const reserveIncentives = reserveIncentivesArray[reserveIndex++];
    const reserveAllocation = reserveDetail.suppliedAmount.div(totalSupplied);
    const weightedReserveFarmAPY = reserveIncentives.collateralFarmIncentives.totalIncentivesApy * reserveAllocation.toNumber();
    totalReserveFarmAPY += weightedReserveFarmAPY;
  }
  
  const totalIncentivesAPY = vaultFarmRewards.totalIncentivesApy + totalReserveFarmAPY;
  const supplyAPY = lendingAPY + totalIncentivesAPY;
  const season4APY = vaultFarmRewards.totalIncentivesApy; // Vault farm 通常是 season rewards
  
  // 输出 Vault Overview 信息
  console.log("┌─────────────────────────────────────────────────────────┐");
  console.log("│  📊 Vault Metrics                                       │");
  console.log("├─────────────────────────────────────────────────────────┤");
  console.log(`│  💰 Total Supplied      $${(holdingsInUSD.totalUSDIncludingFees.toNumber() / 1_000_000).toFixed(2)}M           │`);
  console.log(`│  💸 Total Borrowed      $${(vaultOverview.totalBorrowed.toNumber() / 1_000_000).toFixed(2)}M            │`);
  console.log(`│  📈 Utilization         ${(vaultOverview.utilizationRatio.toNumber() * 100).toFixed(2)}%              │`);
  console.log(`│  🎯 Supply APY          ${(supplyAPY * 100).toFixed(2)}%              │`);
  console.log("├─────────────────────────────────────────────────────────┤");
  console.log("│  🎁 Rewards Overview                                    │");
  console.log("├─────────────────────────────────────────────────────────┤");
  console.log(`│  💎 Incentives APY      ${(totalReserveFarmAPY * 100).toFixed(2)}%              │`);
  
  // 显示 PYUSD rewards
  const pyusdRewards = vaultFarmRewards.incentivesStats.concat(
    reserveIncentivesArray.flatMap((r, idx) => {
      const allocation = Array.from(reservesOverview.values())[idx].suppliedAmount.div(totalSupplied);
      return r.collateralFarmIncentives.incentivesStats.map(s => ({
        ...s,
        weeklyRewards: s.weeklyRewards.mul(allocation.toNumber())
      }));
    })
  ).filter(r => r.rewardMint.toString() === "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo");
  
  pyusdRewards.forEach((reward, idx) => {
    const weeklyK = (reward.weeklyRewards.toNumber() / 1000).toFixed(2);
    console.log(`│  💵 PYUSD Rewards ${idx + 1}    ${weeklyK}K weekly          │`);
  });
  
  console.log("├─────────────────────────────────────────────────────────┤");
  console.log("│  � Season 4 Rewards                                    │");
  console.log("├─────────────────────────────────────────────────────────┤");
  console.log(`│  ⭐ Season 4 APY        ${(season4APY * 100).toFixed(2)}%              │`);
  
  // 显示 KMNO rewards (如果有)
  const kmnoRewards = vaultFarmRewards.incentivesStats.filter(
    r => r.rewardMint.toString() === "KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS"
  );
  
  if (kmnoRewards.length > 0) {
    kmnoRewards.forEach(reward => {
      const weeklyM = (reward.weeklyRewards.toNumber() / 1_000_000).toFixed(2);
      console.log(`│  🎖️  KMNO Rewards       ${weeklyM}M weekly           │`);
    });
  }
  
  console.log("└─────────────────────────────────────────────────────────┘\n");
}

main()
  .then(() => {
    console.log("\n✅ 查询完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 查询失败:", error);
    process.exit(1);
  });
