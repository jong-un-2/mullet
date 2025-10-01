import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Mars } from "./target/types/mars";
import { 
    TOKEN_2022_PROGRAM_ID,
    getAssociatedTokenAddress,
} from "@solana/spl-token";
import { 
    Connection, 
    Keypair, 
    PublicKey,
    AccountMeta,
    TransactionInstruction,
} from "@solana/web3.js";
import * as fs from "fs";
import { HELIUS_RPC, MARS_PROGRAM_ID, KAMINO_V2_PROGRAM, KLEND_PROGRAM, PYUSD_MINT } from "./constants";

// 实际的 PYUSD 账户地址（从交易中获取 - Token-2022）
const PYUSD_ACCOUNT = new PublicKey("DhxxxG3fouc2j9f5AUVqM9M3GHCQydnSeUxXkwJWb3y6");

// Token-2022 Program ID
const TOKEN_2022_PROGRAM = TOKEN_2022_PROGRAM_ID;

// Kamino Vault 地址（PYUSD vault）
const VAULT_ADDRESS = new PublicKey("A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK");

// Event Authority
const EVENT_AUTHORITY = new PublicKey("24tHwQyJJ9akVXxnvkekGfAoeUJXXS7mE6kQNioNySsK");

async function main() {
  console.log("🚀 Mars合约 PYUSD Kamino Deposit 测试 (使用SDK构造账户)\n");

  // 连接到 Solana
  const connection = new Connection(HELIUS_RPC, "confirmed");

  // 加载钱包
  const walletPath = "/Users/joung-un/mars-projects/klend-sdk/examples/phantom-wallet.json";
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));

  console.log("📋 钱包地址:", wallet.publicKey.toBase58());
  console.log("📋 Mars程序ID:", MARS_PROGRAM_ID);
  console.log("📋 PYUSD Mint:", PYUSD_MINT);
  console.log("📋 PYUSD 账户:", PYUSD_ACCOUNT.toBase58());

  // 检查余额
  const solBalance = await connection.getBalance(wallet.publicKey);
  console.log(`\n💰 SOL余额: ${(solBalance / 1e9).toFixed(4)} SOL`);

  const pyusdBalance = await connection.getTokenAccountBalance(PYUSD_ACCOUNT);
  console.log(`💰 PYUSD 余额: ${pyusdBalance.value.uiAmount} PYUSD`);

  // 🎯 使用 SDK 发现的 remaining accounts
  console.log("\n� 使用 SDK 发现的 Remaining Accounts:\n");
  
  // 来自 SDK 的 inspect 结果:
  // 账户 13: 2gc9Dm1eB6UgVYFBUN9bWks6Kes9PbWSaPaa9DqyvEiN [writable] - reserve
  // 账户 14: 7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF [readonly] - lending market
  const remainingAccounts: AccountMeta[] = [
    {
      pubkey: new PublicKey('2gc9Dm1eB6UgVYFBUN9bWks6Kes9PbWSaPaa9DqyvEiN'),
      isSigner: false,
      isWritable: true
    },
    {
      pubkey: new PublicKey('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF'),
      isSigner: false,
      isWritable: false
    }
  ];
  
  console.log("📋 Remaining Accounts (来自SDK的发现):");
  remainingAccounts.forEach((acc, i) => {
    const role = acc.isWritable ? 'writable' : 'readonly';
    console.log(`   ${i}: ${acc.pubkey.toBase58()} [${role}]`);
  });
  console.log();
  
  // 🎯 从 SDK 输出直接复制的账户地址
  console.log("📋 Vault 账户 (来自SDK):");
  const tokenVault = new PublicKey('88ErUYiVu1nmf2VSptraaBewFeBqgXmN9n9xp2U5z1A2');
  const tokenMint = new PublicKey('2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo');
  const baseAuthority = new PublicKey('A8dytfD3E8niG872SJYhwuXV5xmTyozzFKYzhn3zL2wG');
  const sharesMint = new PublicKey('DCqyVY1SFCwq8unnexv9pjujVAC7jsmjfoUWBrNLvbY');
  const sharesAta = new PublicKey('6rJuqfyCBEms6BTBtN6W1M3NB44k6YhmAY8TAqnpYtKq');
  
  console.log("  Vault State:", VAULT_ADDRESS.toBase58());
  console.log("  Token Vault:", tokenVault.toBase58());
  console.log("  Token Mint:", tokenMint.toBase58());
  console.log("  Base Authority:", baseAuthority.toBase58());
  console.log("  Shares Mint:", sharesMint.toBase58());
  console.log("  User Token ATA:", PYUSD_ACCOUNT.toBase58());
  console.log("  User Shares ATA:", sharesAta.toBase58());
  console.log("  Event Authority:", EVENT_AUTHORITY.toBase58());

  // 存款金额
  const depositAmountLamports = 1_000_000; // 1 PYUSD (6 decimals)
  console.log(`\n💰 存款金额: ${depositAmountLamports} micro-units (5 PYUSD)`);

  // 设置 Anchor
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );

  anchor.setProvider(provider);

  const program = anchor.workspace.Mars as Program<Mars>;

  console.log("\n🚀 调用 Mars 合约的 kamino_deposit (使用SDK构造的账户)...\n");

  try {
    const tx = await program.methods
      .kaminoDeposit(new anchor.BN(depositAmountLamports))
      .accounts({
        user: wallet.publicKey,
        vaultState: VAULT_ADDRESS,
        tokenVault: tokenVault,
        tokenMint: tokenMint,
        baseVaultAuthority: baseAuthority,
        sharesMint: sharesMint,
        userTokenAta: PYUSD_ACCOUNT,
        userSharesAta: sharesAta,
        tokenProgram: TOKEN_2022_PROGRAM,
        klendProgram: new PublicKey(KLEND_PROGRAM),
        sharesTokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        eventAuthority: EVENT_AUTHORITY,
        kaminoVaultProgram: new PublicKey(KAMINO_V2_PROGRAM),
      })
      .remainingAccounts(remainingAccounts)
      .rpc();

    console.log("✅ 交易成功!");
    console.log("📝 交易签名:", tx);
    console.log(`🔗 Solscan: https://solscan.io/tx/${tx}`);
    console.log(`🔗 Solana Explorer: https://explorer.solana.com/tx/${tx}`);

    // 检查最终余额
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const pyusdBalanceAfter = await connection.getTokenAccountBalance(
      PYUSD_ACCOUNT
    );
    const sharesBalance = await connection.getTokenAccountBalance(sharesAta);

    console.log("\n💰 交易后余额:");
    console.log(`  PYUSD: ${pyusdBalanceAfter.value.uiAmount}`);
    console.log(`  Shares: ${sharesBalance.value.uiAmount}`);
    
    console.log("\n🌐 查看你的存款:");
    console.log(`  Kamino Vault: https://kamino.finance/earn/${VAULT_ADDRESS.toBase58()}`);
    console.log(`  你的 Shares: https://solscan.io/account/${sharesAta.toBase58()}`);
    
    console.log("\n💡 提示:");
    console.log("  - Shares 代表你在 vault 中的份额");
    console.log("  - 随时间推移会产生收益（APY）");
    console.log("  - 可以随时取款换回 PYUSD + 利息");
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
    console.error("\n❌ 测试失败:", error.message);
    process.exit(1);
  });
