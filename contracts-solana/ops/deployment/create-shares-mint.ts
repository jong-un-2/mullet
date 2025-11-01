import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";
import * as fs from "fs";

async function main() {
  // 读取 admin keypair
  const adminKeypairData = JSON.parse(
    fs.readFileSync("./phantom-wallet.json", "utf-8")
  );
  const admin = Keypair.fromSecretKey(new Uint8Array(adminKeypairData));

  // 读取 shares mint keypair
  const sharesMintKeypairData = JSON.parse(
    fs.readFileSync("./shares-mint-keypair.json", "utf-8")
  );
  const sharesMintKeypair = Keypair.fromSecretKey(
    new Uint8Array(sharesMintKeypairData)
  );

  // 连接到 Solana
  const connection = new Connection(
    "https://rpc.ankr.com/solana/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3",
    "confirmed"
  );

  console.log("Creating shares mint...");
  console.log("Admin:", admin.publicKey.toBase58());
  console.log("Shares Mint Pubkey:", sharesMintKeypair.publicKey.toBase58());

  try {
    // 创建 mint
    const mint = await createMint(
      connection,
      admin,
      admin.publicKey, // mint authority
      null, // freeze authority
      6, // decimals
      sharesMintKeypair
    );

    console.log("\n✅ Shares mint created successfully!");
    console.log("Mint Address:", mint.toBase58());
    console.log("\nYou can now initialize the vault with:");
    console.log(`npm run script initialize-vault -- \\`);
    console.log(`  --keypair phantom-wallet.json \\`);
    console.log(`  --vault_id A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK \\`);
    console.log(`  --base_token_mint EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \\`);
    console.log(`  --shares_mint ${mint.toBase58()} \\`);
    console.log(`  --fee_bps 2500`);
  } catch (error) {
    console.error("Error creating mint:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
