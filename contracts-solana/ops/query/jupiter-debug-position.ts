/**
 * Debug Jupiter Lend Position - 详细查看仓位数据
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getUserLendingPositionByAsset, getLendingTokenDetails } from "@jup-ag/lend/earn";
import { HELIUS_RPC } from "../utils/constants";
import { USDC_MINT } from "../utils/jupiter-lend-helper";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

const RPC_URL = HELIUS_RPC;
const WALLET_PATH = process.env.WALLET_KEYPAIR_PATH || "./phantom-wallet.json";

async function main() {
  console.log("🔍 Debug Jupiter Lend Position\n");

  // 1. 连接
  const connection = new Connection(RPC_URL, "confirmed");
  console.log(`✅ 连接: ${RPC_URL}\n`);

  // 2. 加载钱包
  const walletData = JSON.parse(fs.readFileSync(WALLET_PATH, "utf-8"));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  console.log(`👛 钱包: ${wallet.publicKey.toBase58()}\n`);

  // 3. 获取所有 lending tokens，找到 USDC 的 jlToken
  const allTokens = await import("@jup-ag/lend/earn").then(m => m.getLendingTokens({ connection }));
  let usdcLendingToken: PublicKey | null = null;
  
  for (const token of allTokens) {
    const details = await getLendingTokenDetails({
      lendingToken: token,
      connection,
    });
    if (details.asset.equals(USDC_MINT)) {
      usdcLendingToken = token;
      console.log("✅ 找到 USDC jlToken:", token.toBase58());
      break;
    }
  }

  if (!usdcLendingToken) {
    throw new Error("未找到 USDC lending token");
  }

  // 获取 USDC 池详情
  console.log("\n📊 获取 USDC 池详情...");
  const details = await getLendingTokenDetails({
    lendingToken: usdcLendingToken,
    connection,
  });

  console.log("\n池子信息:");
  console.log("  address:", details.address.toBase58());
  console.log("  asset:", details.asset.toBase58());
  console.log("  decimals:", details.decimals);
  console.log("  totalAssets:", details.totalAssets.toString());
  console.log("  totalSupply:", details.totalSupply.toString());
  console.log("  convertToShares:", details.convertToShares.toString());
  console.log("  convertToAssets:", details.convertToAssets.toString());
  console.log("  supplyRate:", details.supplyRate.toString());
  console.log("  rewardsRate:", details.rewardsRate.toString());

  // 4. 获取用户仓位
  console.log("\n\n💰 获取用户仓位...");
  const position = await getUserLendingPositionByAsset({
    user: wallet.publicKey,
    asset: USDC_MINT,
    connection,
  });

  console.log("\n用户仓位:");
  console.log("  lendingTokenShares:", position.lendingTokenShares.toString());
  console.log("  underlyingAssets:", position.underlyingAssets.toString());
  console.log("  underlyingBalance:", position.underlyingBalance.toString());

  // 5. 计算实际金额
  const sharesAmount = position.lendingTokenShares.toNumber();
  const assetsAmount = position.underlyingAssets.toNumber();
  const balanceAmount = position.underlyingBalance.toNumber();

  console.log("\n转换为 USDC (除以 1e6):");
  console.log("  lendingTokenShares / 1e6:", (sharesAmount / 1e6).toFixed(6), "USDC (份额数量)");
  console.log("  underlyingAssets / 1e6:", (assetsAmount / 1e6).toFixed(6), "USDC (Jupiter Lend 仓位) ✅");
  console.log("  underlyingBalance / 1e6:", (balanceAmount / 1e6).toFixed(6), "USDC (钱包余额) ✅");

  // 6. APY 计算
  const lendingAPY = details.supplyRate.toNumber() / 100;
  const rewardsAPY = details.rewardsRate.toNumber() / 100;
  const totalAPY = lendingAPY + rewardsAPY;
  
  console.log("\n� APY 信息:");
  console.log("  supplyRate:", details.supplyRate.toString(), "(basis points)");
  console.log("  Lending APY:", lendingAPY.toFixed(2), "%");
  console.log("  rewardsRate:", details.rewardsRate.toString(), "(basis points)");
  console.log("  Rewards APY:", rewardsAPY.toFixed(2), "%");
  console.log("  Total APY:", totalAPY.toFixed(2), "%");

  console.log("\n� 说明:");
  console.log("  - 当前总价值 = underlyingAssets =", (assetsAmount / 1e6).toFixed(6), "USDC");
  console.log("  - 收益需要从链上交易历史计算 (SDK 不提供初始存款金额)");
  console.log("  - 份额转换公式: lendingTokenShares * convertToAssets / 1e12");
}

main().catch(console.error);
