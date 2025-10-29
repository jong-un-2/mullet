/**
 * Jupiter Lend Earn 取款脚本
 * 
 * 功能: 从 Jupiter Lend Earn 取款 PYUSD/USDC
 * 用法: ts-node ops/samples/jupiter-lend-withdraw.ts
 */

import { Connection, Keypair } from "@solana/web3.js";
import { JupiterLendHelper, USDC_MINT } from "../utils/jupiter-lend-helper";
import { HELIUS_RPC } from "../utils/constants";
import BN from "bn.js";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

// 配置
const RPC_URL = HELIUS_RPC;
const WALLET_PATH = process.env.WALLET_KEYPAIR_PATH || "./phantom-wallet.json";

// 取款金额 (可配置)
const WITHDRAW_AMOUNT = 1; // 1 USDC

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║     Jupiter Lend Earn - 取款示例                              ║");
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
    console.log(`✅ 钱包地址: ${signer.publicKey.toBase58()}`);

    // 3. 检查 SOL 余额
    const balance = await connection.getBalance(signer.publicKey);
    console.log(`💰 SOL 余额: ${(balance / 1e9).toFixed(6)} SOL`);

    if (balance < 0.01 * 1e9) {
      console.log("❌ 余额不足，至少需要 0.01 SOL 作为交易费");
      return;
    }

    // 4. 初始化 Jupiter Lend Helper
    console.log("\n🚀 初始化 Jupiter Lend Helper...");
    const jupiterLend = new JupiterLendHelper(connection, "mainnet");

    // 5. 显示 USDC 池子详情
    console.log("\n" + "=".repeat(70));
    console.log("💵 USDC 池子详情");
    await jupiterLend.printPoolDetails(USDC_MINT);

    // 6. 准备取款
    const assetToWithdraw = USDC_MINT;
    const assetName = "USDC";

    console.log("\n" + "=".repeat(70));
    console.log(`📤 准备取款 ${WITHDRAW_AMOUNT} ${assetName}`);
    console.log("=".repeat(70));

    // 7. 查询用户取款前的位置
    console.log("\n📊 取款前的用户位置:");
    const positionBefore = await jupiterLend.getUserPosition(assetToWithdraw, signer.publicKey);
    await jupiterLend.printUserPosition(assetToWithdraw, signer.publicKey);

    if (!positionBefore || positionBefore.underlyingAssets.isZero()) {
      console.log("\n❌ 没有存款，无法取款");
      console.log("💡 提示: 先运行 'npm run jupiter:deposit' 进行存款");
      return;
    }

    // 8. 执行取款
    console.log("\n" + "=".repeat(70));
    console.log("💸 开始取款...");
    console.log("=".repeat(70));

    // 转换金额为最小单位 (6 decimals for USDC)
    const amountBN = new BN(WITHDRAW_AMOUNT * 1_000_000);

    // 检查取款金额是否超过余额
    if (amountBN.gt(positionBefore.underlyingAssets)) {
      console.log("\n❌ 取款金额超过可用余额");
      console.log(`可用余额: ${jupiterLend.formatAmount(positionBefore.underlyingAssets, 6)} ${assetName}`);
      console.log(`请求金额: ${WITHDRAW_AMOUNT} ${assetName}`);
      return;
    }

    const signature = await jupiterLend.withdraw(
      amountBN,
      assetToWithdraw,
      signer
    );

    console.log("\n✅ 取款成功!");
    console.log(`📝 交易签名: ${signature}`);
    console.log(`🔗 Solscan: https://solscan.io/tx/${signature}`);

    // 10. 等待一下让链上数据更新
    console.log("\n⏳ 等待链上数据更新...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 11. 查询用户取款后的位置
    console.log("\n📊 取款后的用户位置:");
    await jupiterLend.printUserPosition(assetToWithdraw, signer.publicKey);

    // 12. 计算收益
    const positionAfter = await jupiterLend.getUserPosition(assetToWithdraw, signer.publicKey);
    if (positionAfter) {
      console.log("\n💰 收益统计:");
      console.log("=".repeat(70));
      // 注: 实际收益需要考虑存款时间和 APY
      console.log("💡 提示: 收益会随时间累积，APY 实时变化");
    }

    console.log("\n╔═══════════════════════════════════════════════════════════════╗");
    console.log("║                   ✅ 取款完成                                  ║");
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
