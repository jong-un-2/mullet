/**
 * Jupiter Lend Earn 存款脚本
 * 
 * 功能: 存款 PYUSD 到 Jupiter Lend Earn
 * 用法: ts-node ops/samples/jupiter-lend-deposit.ts
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

// 存款金额 (可配置)
const DEPOSIT_AMOUNT = 1; // 1 USDC

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║     Jupiter Lend Earn - 存款示例                              ║");
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

    // 5. 获取所有支持的代币
    console.log("\n📋 获取 Jupiter Lend 支持的代币...");
    const allTokens = await jupiterLend.getAllLendingTokens();
    console.log(`✅ 支持 ${allTokens.length} 种代币`);

    // 6. 显示 USDC 池子详情
    console.log("\n" + "=".repeat(70));
    console.log("💵 USDC 池子详情");
    await jupiterLend.printPoolDetails(USDC_MINT);

    // 7. 准备存款
    const assetToDeposit = USDC_MINT;
    const assetName = "USDC";

    console.log("\n" + "=".repeat(70));
    console.log(`📥 准备存款 ${DEPOSIT_AMOUNT} ${assetName}`);
    console.log("=".repeat(70));

    // 8. 查询用户存款前的位置
    console.log("\n📊 存款前的用户位置:");
    await jupiterLend.printUserPosition(assetToDeposit, signer.publicKey);

    // 9. 执行存款
    console.log("\n" + "=".repeat(70));
    console.log("💰 开始存款...");
    console.log("=".repeat(70));

    // 转换金额为最小单位 (6 decimals for USDC)
    const amountBN = new BN(DEPOSIT_AMOUNT * 1_000_000);

    const signature = await jupiterLend.deposit(
      amountBN,
      assetToDeposit,
      signer
    );

    console.log("\n✅ 存款成功!");
    console.log(`📝 交易签名: ${signature}`);
    console.log(`🔗 Solscan: https://solscan.io/tx/${signature}`);

    // 11. 等待一下让链上数据更新
    console.log("\n⏳ 等待链上数据更新...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 12. 查询用户存款后的位置
    console.log("\n📊 存款后的用户位置:");
    await jupiterLend.printUserPosition(assetToDeposit, signer.publicKey);

    console.log("\n╔═══════════════════════════════════════════════════════════════╗");
    console.log("║                   ✅ 存款完成                                  ║");
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
