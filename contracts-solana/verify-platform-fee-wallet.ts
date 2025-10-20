import { Connection, PublicKey } from "@solana/web3.js";

const MARS_PROGRAM_ID = new PublicKey("5QctE8ENPTdeYBkBUrWcVYGQMQZtRqBFKEfQF6CZyvh5");
const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3";

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");
  
  const [globalStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("mars-global-state-seed")],
    MARS_PROGRAM_ID
  );

  console.log("GlobalState PDA:", globalStatePDA.toBase58());
  
  const accountInfo = await connection.getAccountInfo(globalStatePDA);
  if (!accountInfo) {
    console.log("GlobalState account not found!");
    return;
  }

  const data = accountInfo.data;
  console.log("\nGlobalState data length:", data.length);
  
  // Read platform_fee_wallet at offset 86
  const platformFeeWalletBytes = data.slice(86, 118);
  const platformFeeWallet = new PublicKey(platformFeeWalletBytes);
  
  console.log("\n✅ Platform Fee Wallet (offset 86-118):");
  console.log("   Address:", platformFeeWallet.toBase58());
  console.log("   Hex:", Buffer.from(platformFeeWalletBytes).toString("hex"));
  
  const expectedWallet = "A7iVLhNhLNaH4q8SZAZVceLUVowisGncQ9gwHVZKc8j6";
  if (platformFeeWallet.toBase58() === expectedWallet) {
    console.log("\n🎉 SUCCESS! Platform fee wallet updated correctly!");
  } else {
    console.log(`\n⚠️  Expected: ${expectedWallet}`);
    console.log(`   Got: ${platformFeeWallet.toBase58()}`);
  }
}

main().catch(console.error);
