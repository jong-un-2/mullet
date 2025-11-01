import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { readFileSync } from "fs";
import { Mars } from "../../target/types/mars";

const RPC_URL = "https://rpc.ankr.com/solana/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3";
const PROGRAM_ID = "G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy";

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");
  
  const wallet = {
    publicKey: PublicKey.default,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };
  
  const provider = new anchor.AnchorProvider(connection, wallet as any, {
    commitment: "confirmed",
  });
  
  const idl = JSON.parse(readFileSync("./target/idl/mars.json", "utf-8"));
  const program = new Program<Mars>(idl, provider);
  
  const [globalState] = PublicKey.findProgramAddressSync(
    [Buffer.from("mars-global-state-seed")],
    new PublicKey(PROGRAM_ID)
  );
  
  const [feeTiers] = PublicKey.findProgramAddressSync(
    [Buffer.from("fee-tiers-seed")],
    new PublicKey(PROGRAM_ID)
  );
  
  const [protocolFee] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol-fee-fraction-seed")],
    new PublicKey(PROGRAM_ID)
  );
  
  console.log("\n🔍 Querying Contract Configuration...");
  console.log("Program ID:", PROGRAM_ID);
  console.log("Global State PDA:", globalState.toBase58());
  
  const state = await program.account.globalState.fetch(globalState);
  
  console.log("\n📊 Global State Configuration:");
  console.log("═".repeat(60));
  console.log("  Admin:", state.admin.toBase58());
  console.log("  Base Mint (USDC):", state.baseMint.toBase58());
  console.log("  Platform Fee Wallet:", state.platformFeeWallet.toBase58());
  console.log("  Frozen:", state.frozen);
  console.log("  Max Order Amount:", state.maxOrderAmount.toString());
  console.log("  Cross Chain Fee:", state.crossChainFeeBps, "bps");
  
  try {
    const protocolFeeData = await program.account.protocolFeeFraction.fetch(protocolFee);
    const protocolFeePercent = (protocolFeeData.numerator.toNumber() / protocolFeeData.denominator.toNumber() * 100).toFixed(2);
    
    console.log("\n💰 Protocol Fee Configuration:");
    console.log("═".repeat(60));
    console.log(`  Protocol Fee PDA: ${protocolFee.toBase58()}`);
    console.log(`  Protocol Fee: ${protocolFeeData.numerator.toString()}/${protocolFeeData.denominator.toString()} = ${protocolFeePercent}%`);
  } catch (e) {
    console.log("\n� Protocol Fee Configuration:");
    console.log("═".repeat(60));
    console.log("  ⚠️  Protocol fee not configured yet");
  }
  
  try {
    const feeTiersData = await program.account.feeTiers.fetch(feeTiers);
    
    console.log("\n📈 Fee Tiers:");
    console.log("═".repeat(60));
    console.log(`  Fee Tiers PDA: ${feeTiers.toBase58()}`);
    console.log(`  Number of Tiers: ${feeTiersData.length}`);
    feeTiersData.feeTiers.forEach((tier: any, i: number) => {
      const thresholdAmount = tier.thresholdAmount.toNumber();
      const feeBps = tier.bpsFee.toNumber();
      const feePercent = (feeBps / 100).toFixed(2);
      console.log(`  Tier ${i + 1}: Amount >= ${thresholdAmount.toLocaleString().padEnd(12)} → Fee: ${feeBps} bps (${feePercent}%)`);
    });
  } catch (e) {
    console.log("\n📈 Fee Tiers:");
    console.log("═".repeat(60));
    console.log("  ⚠️  Fee tiers not configured yet");
  }
  
  console.log("\n✅ Configuration query complete!\n");
}

main().catch(console.error);
