import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Mars } from "./target/types/mars";
import { 
    TOKEN_2022_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { 
    Connection, 
    Keypair, 
    PublicKey,
    ComputeBudgetProgram,
    Transaction,
} from "@solana/web3.js";
import * as fs from "fs";
import Decimal from "decimal.js/decimal";
import { HELIUS_RPC, MARS_PROGRAM_ID, KAMINO_V2_PROGRAM, KLEND_PROGRAM, PYUSD_MINT } from "./constants";
import { KaminoSDKHelper } from "./sdk-helper";

// 实际的 PYUSD 账户地址（Token-2022）
const PYUSD_ACCOUNT = new PublicKey("DhxxxG3fouc2j9f5AUVqM9M3GHCQydnSeUxXkwJWb3y6");

// Token-2022 Program ID
const TOKEN_2022_PROGRAM = TOKEN_2022_PROGRAM_ID;

// Kamino Vault 地址（PYUSD vault）
const VAULT_ADDRESS = new PublicKey("A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK");

// Event Authority
const EVENT_AUTHORITY = new PublicKey("24tHwQyJJ9akVXxnvkekGfAoeUJXXS7mE6kQNioNySsK");

async function main() {
  console.log("🚀 Mars合约 PYUSD 存款并自动质押到Farm测试\n");

  // 连接到 Solana
  const connection = new Connection(HELIUS_RPC, "confirmed");

  // 加载钱包
  const walletPath = "./phantom-wallet.json";
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));

  // 🎯 初始化 SDK Helper
  console.log("⏳ 初始化 Kamino SDK...");
  const sdkHelper = new KaminoSDKHelper(walletPath);
  await sdkHelper.initialize();
  console.log("✅ SDK 初始化完成\n");

  console.log("📋 钱包地址:", wallet.publicKey.toBase58());
  console.log("📋 Mars程序ID:", MARS_PROGRAM_ID);
  console.log("📋 PYUSD Mint:", PYUSD_MINT);
  console.log("📋 PYUSD 账户:", PYUSD_ACCOUNT.toBase58());

  // 检查余额
  const solBalance = await connection.getBalance(wallet.publicKey);
  console.log(`\n💰 SOL余额: ${(solBalance / 1e9).toFixed(4)} SOL`);

  const pyusdBalance = await connection.getTokenAccountBalance(PYUSD_ACCOUNT);
  console.log(`💰 PYUSD 余额: ${pyusdBalance.value.uiAmount} PYUSD`);

  // 存款金额
  const depositAmountLamports = 1_000_000; // 1 PYUSD (6 decimals)
  console.log(`\n💰 存款金额: ${depositAmountLamports / 1_000_000} PYUSD`);

  // 🎯 从 SDK 动态获取所有账户信息
  console.log("\n⏳ 从 Kamino SDK 获取账户信息...");
  const depositAndStakeInfo = await sdkHelper.getDepositAndStakeInfo(
    VAULT_ADDRESS.toBase58(),
    new Decimal(depositAmountLamports / 1_000_000) // 转换为 PYUSD 单位
  );

  // 打印账户信息
  KaminoSDKHelper.printAccountsInfo(depositAndStakeInfo);

  // 提取账户信息
  const { vaultAccounts, remainingAccounts } = depositAndStakeInfo.deposit;
  const { farmAccounts } = depositAndStakeInfo.stake;

  // 设置 Anchor
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );

  anchor.setProvider(provider);

  const program = anchor.workspace.Mars as Program<Mars>;

  console.log("\n🚀 调用 Mars 合约的 kamino_deposit_and_stake (存款并自动质押)...\n");

  try {
    // 检查并创建 shares ATA（如果不存在）
    const sharesAta = vaultAccounts.userSharesAta;
    const accountInfo = await connection.getAccountInfo(sharesAta);
    
    if (!accountInfo) {
      console.log("⚠️  Shares ATA 不存在，正在创建...");
      const createAtaIx = createAssociatedTokenAccountInstruction(
        wallet.publicKey, // payer
        sharesAta, // ata
        wallet.publicKey, // owner
        vaultAccounts.sharesMint, // mint
        TOKEN_PROGRAM_ID // token program (SPL Token, 不是 Token-2022)
      );
      
      const createAtaTx = new Transaction().add(createAtaIx);
      const sig = await connection.sendTransaction(createAtaTx, [wallet], {
        skipPreflight: false,
        preflightCommitment: "confirmed"
      });
      await connection.confirmTransaction(sig, "confirmed");
      console.log("✅ Shares ATA 创建成功:", sig);
    } else {
      console.log("✅ Shares ATA 已存在");
    }

    // 增加 Compute Units 限额到 400,000
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 400_000
    });
    
    const tx = await program.methods
      .kaminoDepositAndStake(new anchor.BN(depositAmountLamports))
      .accounts({
        user: wallet.publicKey,
        vaultState: VAULT_ADDRESS,
        tokenVault: vaultAccounts.tokenVault,
        tokenMint: vaultAccounts.tokenMint,
        baseVaultAuthority: vaultAccounts.baseAuthority,
        sharesMint: vaultAccounts.sharesMint,
        userTokenAta: PYUSD_ACCOUNT,
        userSharesAta: vaultAccounts.userSharesAta,
        klendProgram: new PublicKey(KLEND_PROGRAM),
        tokenProgram: TOKEN_2022_PROGRAM,  // PYUSD 是 Token-2022
        sharesTokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        eventAuthority: EVENT_AUTHORITY,
        kaminoVaultProgram: new PublicKey(KAMINO_V2_PROGRAM),
        farmState: farmAccounts.farmState,
        userFarm: farmAccounts.userFarm,
        delegatedStake: farmAccounts.delegatedStake,
        farmsProgram: farmAccounts.farmsProgram,
        farmTokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,  // Farm 需要普通 Token Program
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions([modifyComputeUnits])  // 添加 Compute Budget 指令
      .rpc();

    console.log("✅ 交易成功!");
    console.log("📝 交易签名:", tx);
    console.log(`🔗 Solscan: https://solscan.io/tx/${tx}`);
    console.log(`🔗 Solana Explorer: https://explorer.solana.com/tx/${tx}`);

    // 检查最终余额
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const pyusdBalanceAfter = await connection.getTokenAccountBalance(PYUSD_ACCOUNT);
    const sharesBalance = await connection.getTokenAccountBalance(vaultAccounts.userSharesAta);

    console.log("\n💰 交易后余额:");
    console.log(`  PYUSD: ${pyusdBalanceAfter.value.uiAmount}`);
    console.log(`  Shares (钱包): ${sharesBalance.value.uiAmount}`);
    
    console.log("\n🌐 查看你的存款:");
    console.log(`  Kamino Vault: https://kamino.finance/earn/${VAULT_ADDRESS.toBase58()}`);
    console.log(`  Kamino Farm (应该能看到了!): https://app.kamino.finance/liquidity/farms`);
    console.log(`  你的 Shares ATA: https://solscan.io/account/${vaultAccounts.userSharesAta.toBase58()}`);
    console.log(`  User Farm Account: https://solscan.io/account/${farmAccounts.userFarm.toBase58()}`);
    
    console.log("\n💡 提示:");
    console.log("  ✅ Shares 已经自动质押到 Farm");
    console.log("  ✅ 现在你应该能在 Kamino 官网看到你的存款了");
    console.log("  ✅ 你会开始赚取 Farm 奖励");
    console.log("  💎 Shares 在 Farm 合约中，不在你钱包里（这是正常的）");
  } catch (error: any) {
    console.error("\n❌ 交易失败:", error.message);
    if (error.logs) {
      console.log("\n📜 交易日志:");
      error.logs.forEach((log: string) => console.log("  ", log));
    }
    throw error;
  }
}

main()
  .then(() => {
    console.log("\n✅ 测试完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 测试失败:", error);
    process.exit(1);
  });
