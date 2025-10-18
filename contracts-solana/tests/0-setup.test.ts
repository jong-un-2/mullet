/**
 * Mars 测试基础设置
 * 
 * 这个文件会首先运行，负责：
 * 1. 初始化 GlobalState
 * 2. 设置基础配置
 * 3. 为后续测试准备环境
 * 
 * 其他测试文件（admin, vault, kamino）依赖这个文件
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Mars } from "../target/types/mars";
import {
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { assert } from "chai";

describe("🏗️ Setup - Base Initialization", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Mars as Program<Mars>;
  const wallet = provider.wallet;
  const payer = Keypair.generate();

  let usdcMint: PublicKey;
  let globalState: PublicKey;
  let asset: PublicKey;
  let vault: PublicKey;
  let vaultAta: PublicKey;

  before(async () => {
    console.log("\n" + "=".repeat(80));
    console.log("🏗️ Mars Test Suite - Base Setup");
    console.log("=".repeat(80));

    // 1. 为 payer 充值
    console.log("\n💰 Funding payer account...");
    const sig = await provider.connection.requestAirdrop(
      payer.publicKey,
      100 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);
    console.log(`   ✅ Payer: ${payer.publicKey.toBase58()}`);
    console.log(`   ✅ Wallet (Admin): ${wallet.publicKey.toBase58()}`);

    // 2. 创建 USDC mint
    console.log("\n🪙 Creating USDC mint...");
    usdcMint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      6
    );
    console.log(`   ✅ USDC Mint: ${usdcMint.toBase58()}`);

    // 3. 派生 GlobalState, Asset 和 Vault PDAs
    [globalState] = PublicKey.findProgramAddressSync(
      [Buffer.from("mars-global-state-seed")],
      program.programId
    );
    console.log(`\n🌍 Global State PDA: ${globalState.toBase58()}`);

    [asset] = PublicKey.findProgramAddressSync(
      [Buffer.from("asset-seed")],
      program.programId
    );
    console.log(`📊 Asset PDA: ${asset.toBase58()}`);

    [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from("mars-vault")],
      program.programId
    );
    console.log(`🏦 Mars Vault PDA: ${vault.toBase58()}`);

    // 4. 创建 vault ATA
    vaultAta = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        usdcMint,
        vault,
        true
      )
    ).address;
    console.log(`💰 Vault ATA: ${vaultAta.toBase58()}`);

    // 5. 给 vault 铸造代币
    await mintTo(
      provider.connection,
      payer,
      usdcMint,
      vaultAta,
      payer,
      1_000_000 // 1 USDC
    );
    console.log("   ✅ Minted 1 USDC to vault");

    console.log("\n" + "=".repeat(80));
    console.log("✅ Base setup complete!\n");
  });

  describe("1️⃣ Initialize Global State", () => {
    it("Should initialize global state", async () => {
      console.log("\n🚀 Initializing Global State...");
      console.log(`   Admin: ${wallet.publicKey.toBase58()}`);
      console.log(`   USDC Mint: ${usdcMint.toBase58()}`);

      const tx = await program.methods
        .initialize()
        .accountsStrict({
          admin: wallet.publicKey,
          globalState: globalState,
          asset: asset,
          vault: vault,
          ataVault: vaultAta,
          usdcMint: usdcMint,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log(`   📝 Transaction: ${tx}`);

      // 验证初始化
      const globalStateAccount = await program.account.globalState.fetch(globalState);
      
      assert.equal(
        globalStateAccount.admin.toBase58(),
        wallet.publicKey.toBase58(),
        "Admin should be wallet"
      );
      console.log(`   ✅ Admin set: ${globalStateAccount.admin.toBase58()}`);

      assert.ok(
        globalStateAccount.platformFeeWallet,
        "Platform fee wallet should be initialized"
      );
      console.log(`   ✅ Platform Fee Wallet: ${globalStateAccount.platformFeeWallet.toBase58()}`);

      console.log("   ✅ Global State initialized successfully!");
      console.log("\n" + "=".repeat(80));
      console.log("🎉 Setup complete! Other tests can now run.");
      console.log("=".repeat(80) + "\n");
    });
  });

  describe("2️⃣ Setup Summary", () => {
    it("Should display initialized resources", () => {
      console.log("\n📋 Initialized Resources:");
      console.log("   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`   Program ID: ${program.programId.toBase58()}`);
      console.log(`   Admin: ${wallet.publicKey.toBase58()}`);
      console.log(`   Global State: ${globalState.toBase58()}`);
      console.log(`   USDC Mint: ${usdcMint.toBase58()}`);
      console.log(`   Mars Vault: ${vault.toBase58()}`);
      console.log(`   Vault ATA: ${vaultAta.toBase58()}`);
      console.log("   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("\n✅ All subsequent tests will use these resources\n");
    });
  });
});
