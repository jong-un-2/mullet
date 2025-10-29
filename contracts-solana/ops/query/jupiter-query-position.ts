/**
 * Jupiter Lend Earn 用户位置查询脚本
 * 
 * 功能: 查询用户在 Jupiter Lend Earn 的所有存款位置
 * 用法: ts-node ops/query/query-jupiter-lend-position.ts
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { JupiterLendHelper, USDC_MINT, SOL_NATIVE } from "../utils/jupiter-lend-helper";
import { HELIUS_RPC } from "../utils/constants";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

// 配置
const RPC_URL = HELIUS_RPC;
const WALLET_PATH = process.env.WALLET_KEYPAIR_PATH || "./phantom-wallet.json";

// 常见的 Jupiter Lend 支持资产
const COMMON_ASSETS = [
  { name: "USDC", mint: USDC_MINT },
  // { name: "SOL", mint: SOL_NATIVE },
];

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║     Jupiter Lend Earn - 用户位置查询                          ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");

  try {
    // 1. 初始化连接
    console.log("\n🔗 连接到 Solana 主网...");
    const connection = new Connection(RPC_URL, "confirmed");
    console.log(`✅ 已连接: ${RPC_URL}`);

    // 2. 加载钱包
    console.log("\n🔑 加载钱包...");
    const walletData = JSON.parse(fs.readFileSync(WALLET_PATH, "utf-8"));
    const signer = Keypair.fromSecretKey(new Uint8Array(walletData));
    const userAddress = signer.publicKey;
    console.log(`✅ 钱包地址: ${userAddress.toBase58()}`);

    // 3. 检查 SOL 余额
    const balance = await connection.getBalance(userAddress);
    console.log(`💰 SOL 余额: ${(balance / 1e9).toFixed(6)} SOL`);

    // 4. 初始化 Jupiter Lend Helper
    console.log("\n🚀 初始化 Jupiter Lend Helper...");
    const jupiterLend = new JupiterLendHelper(connection, "mainnet");

    // 5. 获取所有支持的代币
    const allTokens = await jupiterLend.getAllLendingTokens();
    console.log(`\n💎 Jupiter Lend 支持 ${allTokens.length} 种代币资产`);

    // 6. 查询用户在常见资产中的位置
    console.log("\n" + "=" .repeat(70));
    console.log("💰 Jupiter Lend Earn - 你的存款位置");
    console.log("=" .repeat(70));

    let totalValueUSD = 0;
    let hasAnyPosition = false;

    for (const asset of COMMON_ASSETS) {
      try {
        console.log(`\n🔍 正在查询 ${asset.name}...`);
        const details = await jupiterLend.getLendingTokenDetails(asset.mint);
        const position = await jupiterLend.getUserPosition(asset.mint, userAddress);

        if (position && details && !position.underlyingAssets.isZero()) {
          hasAnyPosition = true;
          
          // 显示池子详细信息（用于 debug）
          console.log(`\n📊 ${asset.name} 池子详情:`);
          console.log(`  address:           ${details.address.toBase58()}`);
          console.log(`  asset:             ${asset.mint.toBase58()}`);
          console.log(`  decimals:          ${details.decimals}`);
          console.log(`  totalAssets:       ${details.totalAssets.toString()}`);
          console.log(`  totalSupply:       ${details.totalSupply.toString()}`);
          console.log(`  convertToShares:   ${details.convertToShares.toString()}`);
          console.log(`  convertToAssets:   ${details.convertToAssets.toString()}`);
          console.log(`  supplyRate:        ${details.supplyRate.toString()}`);
          console.log(`  rewardsRate:       ${details.rewardsRate.toString()}`);
          
          // 计算各项数据
          const balance = jupiterLend.formatAmount(position.underlyingAssets, details.decimals);
          const lendingAPY = jupiterLend.calculateAPY(details.supplyRate);
          const rewardsAPY = jupiterLend.calculateAPY(details.rewardsRate);
          const totalAPY = lendingAPY + rewardsAPY;
          const tvl = jupiterLend.formatAmount(details.totalAssets, details.decimals);

          console.log(`\n💰 ${asset.name} 位置:`);
          console.log(`  当前余额 (Your Deposits):  $${balance} ${asset.name}`);
          console.log(`  年化收益率 (Total APY):     ${totalAPY.toFixed(2)}%`);
          console.log(`    ├─ Lending APY:           ${lendingAPY.toFixed(2)}%`);
          console.log(`    └─ USDC Rewards:          ${rewardsAPY.toFixed(2)}%`);
          console.log(`  预计年收益:                 $${(parseFloat(balance) * totalAPY / 100).toFixed(2)} ${asset.name}`);
          console.log(`  总锁仓量 (TVL):             $${tvl} ${asset.name}`);
          console.log(`  持有份额 (Shares):          ${position.lendingTokenShares.toString()}`);
          console.log(`\n  💡 提示: 实际收益需要通过链上交易历史计算`);        } else {
          console.log(`  ➜ 无 ${asset.name} 存款`);
        }
      } catch (error) {
        console.log(`⚠️  查询 ${asset.name} 失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (!hasAnyPosition) {
      console.log("\n📭 未找到任何存款位置");
      console.log("💡 提示: 运行 'npm run jupiter:deposit' 开始存款");
    }

    // 9. 显示使用提示
    console.log("\n" + "=" .repeat(70));
    console.log("💡 操作提示");
    console.log("=" .repeat(70));
    console.log("  存款: npm run jupiter:deposit");
    console.log("  取款: npm run jupiter:withdraw");
    console.log("  查询: npm run jupiter:query");

    console.log("\n╔═══════════════════════════════════════════════════════════════╗");
    console.log("║                   ✅ 查询完成                                  ║");
    console.log("╚═══════════════════════════════════════════════════════════════╝");

  } catch (error) {
    console.error("\n❌ 错误:", error);
    if (error instanceof Error) {
      console.error("错误详情:", error.message);
      console.error("堆栈:", error.stack);
    }
    process.exit(1);
  }
}

// 运行脚本
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
