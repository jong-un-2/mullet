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
import { getDepositContext, getWithdrawContext } from "@jup-ag/lend/earn";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import fs from "fs";
import path from "path";

// Jupiter Lend 程序 ID
const JUPITER_LEND_PROGRAM_ID = new PublicKey("jup3YeL8QhtSx1e253b2FDvsMNC87fDrgQZivbrndc9");

// Mars Protocol 程序 ID
const MARS_PROGRAM_ID = new PublicKey("Dfr6zir7nV2DWduqhtHNdkJn4mMxHf9G8muQSatiZ1k9");

// USDC Mint
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

// RPC 连接
const HELIUS_RPC_URL = process.env.HELIUS_RPC_URL || "https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY";

/**
 * 加载用户钱包
 */
function loadWallet(): Keypair {
  const walletPath = path.join(process.env.HOME || "", ".config/solana/id.json");
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(walletData));
}

/**
 * 示例 1: 通过 Mars Protocol CPI 调用存款到 Jupiter Lend
 */
async function exampleMarsJupiterLendDeposit() {
  console.log("\n=== Mars Protocol → Jupiter Lend 存款示例 ===\n");

  const connection = new Connection(HELIUS_RPC_URL, "confirmed");
  const wallet = loadWallet();
  
  console.log("👤 用户钱包:", wallet.publicKey.toBase58());

  // 1. 获取 Jupiter Lend 存款所需的账户上下文
  console.log("\n📋 获取 Jupiter Lend 存款上下文...");
  const depositContext = await getDepositContext({
    asset: USDC_MINT,
    signer: wallet.publicKey,
    connection,
  });

  console.log("✅ 存款上下文账户:");
  console.log("  - signer:", depositContext.signer.toBase58());
  console.log("  - depositorTokenAccount:", depositContext.depositorTokenAccount.toBase58());
  console.log("  - recipientTokenAccount:", depositContext.recipientTokenAccount.toBase58());
  console.log("  - lendingAdmin:", depositContext.lendingAdmin.toBase58());
  console.log("  - lending:", depositContext.lending.toBase58());
  console.log("  - fTokenMint:", depositContext.fTokenMint.toBase58());

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

  try {
    const tx = await marsProgram.methods
      .jupiterLendDeposit(depositAmount)
      .accounts({
        signer: wallet.publicKey,
        depositorTokenAccount: depositContext.depositorTokenAccount,
        recipientTokenAccount: depositContext.recipientTokenAccount,
        lendingAdmin: depositContext.lendingAdmin,
        lending: depositContext.lending,
        fTokenMint: depositContext.fTokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        jupiterLendProgram: JUPITER_LEND_PROGRAM_ID,
      })
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

  const connection = new Connection(HELIUS_RPC_URL, "confirmed");
  const wallet = loadWallet();
  
  console.log("👤 用户钱包:", wallet.publicKey.toBase58());

  // 1. 获取 Jupiter Lend 取款所需的账户上下文
  console.log("\n📋 获取 Jupiter Lend 取款上下文...");
  const withdrawContext = await getWithdrawContext({
    asset: USDC_MINT,
    signer: wallet.publicKey,
    connection,
  });

  console.log("✅ 取款上下文账户:");
  console.log("  - signer:", withdrawContext.signer.toBase58());
  console.log("  - ownerTokenAccount:", withdrawContext.ownerTokenAccount.toBase58());
  console.log("  - recipientTokenAccount:", withdrawContext.recipientTokenAccount.toBase58());
  console.log("  - lendingAdmin:", withdrawContext.lendingAdmin.toBase58());
  console.log("  - lending:", withdrawContext.lending.toBase58());
  console.log("  - fTokenMint:", withdrawContext.fTokenMint.toBase58());

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

  try {
    const tx = await marsProgram.methods
      .jupiterLendWithdraw(withdrawAmount)
      .accounts({
        signer: wallet.publicKey,
        depositorTokenAccount: withdrawContext.ownerTokenAccount,
        recipientTokenAccount: withdrawContext.recipientTokenAccount,
        lendingAdmin: withdrawContext.lendingAdmin,
        lending: withdrawContext.lending,
        fTokenMint: withdrawContext.fTokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        jupiterLendProgram: JUPITER_LEND_PROGRAM_ID,
      })
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
