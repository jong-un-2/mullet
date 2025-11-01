/**
 * Mars Protocol - Jupiter Lend CPI 调用示例
 * 
 * 演示如何通过 Mars Protocol 合约调用 Jupiter Lend 的存款和取款功能
 * 使用 CPI (Cross-Program Invocation) 实现跨程序调用
 * 
 * 使用方法:
 * ```bash
 * npm run mars:jupiter:deposit  # 存款示例
 * npm run mars:jupiter:withdraw # 取款示例
 * ```
 */

import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { getDepositIx, getWithdrawIx } from "@jup-ag/lend/earn";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import fs from "fs";
import path from "path";

// Jupiter Lend 程序 ID
const JUPITER_LEND_PROGRAM_ID = new PublicKey("jup3YeL8QhtSx1e253b2FDvsMNC87fDrgQZivbrndc9");

// Mars Protocol 程序 ID (Verified deployment - Slot 376601697)
const MARS_PROGRAM_ID = new PublicKey("G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy");

// USDC Mint
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

// RPC 连接
const ANKR_RPC_URL = process.env.ANKR_RPC_URL || "https://rpc.ankr.com/solana/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3";

/**
 * 加载用户钱包
 */
function loadWallet(): Keypair {
  const walletPath = process.env.WALLET_KEYPAIR_PATH || path.join(__dirname, "../../phantom-wallet.json");
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(walletData));
}

/**
 * 示例 1: 通过 Mars Protocol CPI 调用存款到 Jupiter Lend
 */
async function exampleMarsJupiterLendDeposit() {
  console.log("\n=== Mars Protocol → Jupiter Lend 存款示例 ===\n");

  const connection = new Connection(ANKR_RPC_URL, "confirmed");
  const wallet = loadWallet();
  
  console.log("👤 用户钱包:", wallet.publicKey.toBase58());

  // 1. 获取 Jupiter Lend 存款指令（包含完整的账户列表）
  console.log("\n📋 获取 Jupiter Lend 存款指令...");
  const depositIx = await getDepositIx({
    amount: new BN(1_000_000),
    asset: USDC_MINT,
    signer: wallet.publicKey,
    connection,
  });

  console.log("✅ 存款指令账户 (共", depositIx.keys.length, "个):");
  depositIx.keys.forEach((key, i) => {
    if (i < 7) {
      console.log(`  ${i + 1}. ${key.pubkey.toBase58()}`);
    }
  });

  // 2. 加载 Mars Protocol 程序
  const provider = new AnchorProvider(connection, new Wallet(wallet), {
    commitment: "confirmed",
  });

  // 加载 IDL (假设已经生成)
  const idlPath = path.join(__dirname, "../../target/idl/mars.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const marsProgram = new Program(idl, provider);

  // 3. 调用 Mars Protocol 的 jupiter_lend_deposit 指令
  const depositAmount = new BN(1_000_000); // 1 USDC
  
  console.log("\n💰 存款金额: 1 USDC (1,000,000 基础单位)");
  console.log("\n📤 发送 Mars Protocol CPI 调用...");

  // 从指令中提取账户
  const depositAccounts = {
    signer: wallet.publicKey,
    depositorTokenAccount: depositIx.keys[1].pubkey,
    recipientTokenAccount: depositIx.keys[2].pubkey,
    mint: depositIx.keys[3].pubkey,
    lendingAdmin: depositIx.keys[4].pubkey,
    lending: depositIx.keys[5].pubkey,
    fTokenMint: depositIx.keys[6].pubkey,
    tokenProgram: TOKEN_PROGRAM_ID,
    jupiterLendProgram: JUPITER_LEND_PROGRAM_ID,
  };

  // remaining_accounts: 账户 7-16 (索引 7-16)
  const remainingAccounts = depositIx.keys.slice(7).map(key => ({
    pubkey: key.pubkey,
    isSigner: key.isSigner,
    isWritable: key.isWritable,
  }));

  try {
    const tx = await marsProgram.methods
      .jupiterLendDeposit(depositAmount)
      .accounts(depositAccounts)
      .remainingAccounts(remainingAccounts)
      .rpc();

    console.log("\n✅ 存款成功!");
    console.log("📝 交易签名:", tx);
    console.log("🔗 Solscan:", `https://solscan.io/tx/${tx}`);
  } catch (error) {
    console.error("❌ 存款失败:", error);
    throw error;
  }
}

/**
 * 示例 2: 通过 Mars Protocol CPI 调用从 Jupiter Lend 取款
 */
async function exampleMarsJupiterLendWithdraw() {
  console.log("\n=== Mars Protocol → Jupiter Lend 取款示例 ===\n");

  const connection = new Connection(ANKR_RPC_URL, "confirmed");
  const wallet = loadWallet();
  
  console.log("👤 用户钱包:", wallet.publicKey.toBase58());

  // 1. 获取 Jupiter Lend 取款指令（包含完整的账户列表）
  console.log("\n📋 获取 Jupiter Lend 取款指令...");
  const withdrawIx = await getWithdrawIx({
    amount: new BN(1_000_000),
    asset: USDC_MINT,
    signer: wallet.publicKey,
    connection,
  });

  console.log("✅ 取款指令账户 (共", withdrawIx.keys.length, "个):");
  withdrawIx.keys.forEach((key, i) => {
    if (i < 7) {
      console.log(`  ${i + 1}. ${key.pubkey.toBase58()}`);
    }
  });

  // 2. 加载 Mars Protocol 程序
  const provider = new AnchorProvider(connection, new Wallet(wallet), {
    commitment: "confirmed",
  });

  const idlPath = path.join(__dirname, "../../target/idl/mars.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const marsProgram = new Program(idl, provider);

  // 3. 调用 Mars Protocol 的 jupiter_lend_withdraw 指令
  const withdrawAmount = new BN(1_000_000); // 1 USDC
  
  console.log("\n💰 取款金额: 1 USDC (1,000,000 基础单位)");
  console.log("\n📤 发送 Mars Protocol CPI 调用...");

  // 从指令中提取账户 (注意取款账户顺序与存款不同)
  const withdrawAccounts = {
    signer: wallet.publicKey,
    recipientTokenAccount: withdrawIx.keys[1].pubkey,  // jlToken账户
    depositorTokenAccount: withdrawIx.keys[2].pubkey,  // USDC账户
    lendingAdmin: withdrawIx.keys[3].pubkey,
    lending: withdrawIx.keys[4].pubkey,
    mint: withdrawIx.keys[5].pubkey,
    fTokenMint: withdrawIx.keys[6].pubkey,
    tokenProgram: TOKEN_PROGRAM_ID,
    jupiterLendProgram: JUPITER_LEND_PROGRAM_ID,
  };

  // remaining_accounts: 账户 7-17 (索引 7-17)
  const remainingAccounts = withdrawIx.keys.slice(7).map(key => ({
    pubkey: key.pubkey,
    isSigner: key.isSigner,
    isWritable: key.isWritable,
  }));

  try {
    const tx = await marsProgram.methods
      .jupiterLendWithdraw(withdrawAmount)
      .accounts(withdrawAccounts)
      .remainingAccounts(remainingAccounts)
      .rpc();

    console.log("\n✅ 取款成功!");
    console.log("📝 交易签名:", tx);
    console.log("🔗 Solscan:", `https://solscan.io/tx/${tx}`);
  } catch (error) {
    console.error("❌ 取款失败:", error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const action = args[0] || "deposit";

  if (action === "deposit") {
    await exampleMarsJupiterLendDeposit();
  } else if (action === "withdraw") {
    await exampleMarsJupiterLendWithdraw();
  } else {
    console.error("❌ 未知操作:", action);
    console.log("\n使用方法:");
    console.log("  npm run mars:jupiter:deposit   - 存款示例");
    console.log("  npm run mars:jupiter:withdraw  - 取款示例");
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ 执行失败:", error);
    process.exit(1);
  });
}
