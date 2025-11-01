/**
 * 调试脚本 - 检查 Jupiter Lend 存款指令的完整账户结构
 */

import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { getDepositIx, getWithdrawIx } from "@jup-ag/lend/earn";
import BN from "bn.js";
import fs from "fs";
import path from "path";

const ANKR_RPC = "https://rpc.ankr.com/solana/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3";
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

async function main() {
  console.log("\n=== 检查 Jupiter Lend 存款指令结构 ===\n");

  const connection = new Connection(ANKR_RPC, "confirmed");
  
  // 加载钱包
  const walletPath = path.join(__dirname, "../../phantom-wallet.json");
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const signer = Keypair.fromSecretKey(new Uint8Array(walletData));
  
  console.log("👤 用户钱包:", signer.publicKey.toBase58());
  console.log("\n📋 获取存款指令...\n");

  const depositIx = await getDepositIx({
    amount: new BN(1_000_000), // 1 USDC
    asset: USDC_MINT,
    signer: signer.publicKey,
    connection,
  });

  console.log("Program ID:", depositIx.programId.toBase58());
  console.log("\n账户列表 (总共", depositIx.keys.length, "个):\n");
  
  depositIx.keys.forEach((key, index) => {
    console.log(`${index + 1}. ${key.pubkey.toBase58()}`);
    console.log(`   - isSigner: ${key.isSigner}`);
    console.log(`   - isWritable: ${key.isWritable}`);
    console.log();
  });

  console.log("Data length:", depositIx.data.length);
  console.log("Data (hex):", Buffer.from(depositIx.data).toString("hex"));
  console.log("Data (bytes):", Array.from(depositIx.data));

  console.log("\n\n=== 检查取款指令结构 ===\n");

  const withdrawIx = await getWithdrawIx({
    amount: new BN(1_000_000),
    asset: USDC_MINT,
    signer: signer.publicKey,
    connection,
  });

  console.log("Program ID:", withdrawIx.programId.toBase58());
  console.log("\n账户列表 (总共", withdrawIx.keys.length, "个):\n");
  
  withdrawIx.keys.forEach((key, index) => {
    console.log(`${index + 1}. ${key.pubkey.toBase58()}`);
    console.log(`   - isSigner: ${key.isSigner}`);
    console.log(`   - isWritable: ${key.isWritable}`);
    console.log();
  });

  console.log("Data length:", withdrawIx.data.length);
  console.log("Data (hex):", Buffer.from(withdrawIx.data).toString("hex"));
  console.log("Data (bytes):", Array.from(withdrawIx.data));
}

main().catch(console.error);
