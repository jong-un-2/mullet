import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Mars } from "./target/types/mars";
import { 
    TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { 
    Connection, 
    Keypair, 
    PublicKey,
    AccountMeta,
} from "@solana/web3.js";
import * as fs from "fs";
import { HELIUS_RPC, MARS_PROGRAM_ID, KAMINO_V2_PROGRAM, KLEND_PROGRAM, PYUSD_MINT } from "./constants";

// 实际的 PYUSD 账户地址
const PYUSD_ACCOUNT = new PublicKey("DhxxxG3fouc2j9f5AUVqM9M3GHCQydnSeUxXkwJWb3y6");

// Token-2022 Program ID
const TOKEN_2022_PROGRAM = TOKEN_2022_PROGRAM_ID;

// Kamino Vault 地址
const VAULT_ADDRESS = new PublicKey("A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK");

// Event Authority
const EVENT_AUTHORITY = new PublicKey("24tHwQyJJ9akVXxnvkekGfAoeUJXXS7mE6kQNioNySsK");

async function main() {
  console.log("🚀 Mars合约 PYUSD Kamino Withdraw 测试 (取款全部)\n");

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

  const pyusdBalanceBefore = await connection.getTokenAccountBalance(PYUSD_ACCOUNT);
  console.log(`💰 PYUSD 余额: ${pyusdBalanceBefore.value.uiAmount} PYUSD`);

  // 🎯 从 SDK 发现的 remaining accounts (账户 13-25)
  console.log("\n📋 使用 SDK 发现的 Remaining Accounts:\n");
  
  // Withdraw 需要更多 remaining accounts
  const remainingAccounts: AccountMeta[] = [
    // Account 13: vault_state (duplicate)
    {
      pubkey: new PublicKey('A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK'),
      isSigner: false,
      isWritable: true
    },
    // Account 14: reserve 1
    {
      pubkey: new PublicKey('2gc9Dm1eB6UgVYFBUN9bWks6Kes9PbWSaPaa9DqyvEiN'),
      isSigner: false,
      isWritable: true
    },
    // Account 15: reserve 2
    {
      pubkey: new PublicKey('DnpGhhzxN1ZFLuiFvtk3aLKGQ4KsML4DAXAZ5u4mrPd8'),
      isSigner: false,
      isWritable: true
    },
    // Account 16: lending market 1
    {
      pubkey: new PublicKey('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF'),
      isSigner: false,
      isWritable: false
    },
    // Account 17: lending market 2
    {
      pubkey: new PublicKey('9DrvZvyWh1HuAoZxvYWMvkf2XCzryCpGgHqrMjyDWpmo'),
      isSigner: false,
      isWritable: false
    },
    // Account 18: reserve liquidity supply 1
    {
      pubkey: new PublicKey('Gm2itCNPBpBSSrgCA194pmErjwHAFVpvBBFvpdTF5LuJ'),
      isSigner: false,
      isWritable: true
    },
    // Account 19: reserve liquidity supply 2
    {
      pubkey: new PublicKey('2dQkXr1e9LBvT2QcfKrzZaWY6gGAAVoCjLgkWFk3Mhkj'),
      isSigner: false,
      isWritable: true
    },
    // Account 20: token program
    {
      pubkey: anchor.utils.token.TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false
    },
    // Account 21: sysvar instructions
    {
      pubkey: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      isSigner: false,
      isWritable: false
    },
    // Account 22: event authority (duplicate)
    {
      pubkey: EVENT_AUTHORITY,
      isSigner: false,
      isWritable: false
    },
    // Account 23: kamino vault program (duplicate)
    {
      pubkey: new PublicKey(KAMINO_V2_PROGRAM),
      isSigner: false,
      isWritable: false
    },
    // Account 24: reserve 1 (duplicate)
    {
      pubkey: new PublicKey('2gc9Dm1eB6UgVYFBUN9bWks6Kes9PbWSaPaa9DqyvEiN'),
      isSigner: false,
      isWritable: true
    },
    // Account 25: lending market 1 (duplicate)
    {
      pubkey: new PublicKey('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF'),
      isSigner: false,
      isWritable: false
    }
  ];
  
  console.log("📋 Remaining Accounts:");
  remainingAccounts.forEach((acc, i) => {
    const role = acc.isWritable ? 'writable' : 'readonly';
    console.log(`   ${i}: ${acc.pubkey.toBase58()} [${role}]`);
  });
  console.log();

  // 🎯 从 SDK 复制的账户地址
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

  // 检查 shares 余额
  const sharesBalance = await connection.getTokenAccountBalance(sharesAta);
  console.log(`\n💎 你的 Shares: ${sharesBalance.value.uiAmount} shares`);

  // 取款金额: 全部 shares
  const withdrawSharesLamports = parseInt(sharesBalance.value.amount); // 全部
  console.log(`\n💰 取款金额: ${withdrawSharesLamports} shares (全部)`);

  // 设置 Anchor
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );

  anchor.setProvider(provider);

  const program = anchor.workspace.Mars as Program<Mars>;

  console.log("\n🚀 调用 Mars 合约的 kamino_withdraw...\n");

  try {
    const tx = await program.methods
      .kaminoWithdraw(new anchor.BN(withdrawSharesLamports))
      .accounts({
        user: wallet.publicKey,
        vaultState: VAULT_ADDRESS,
        tokenVault: tokenVault,
        baseVaultAuthority: baseAuthority,
        userTokenAta: PYUSD_ACCOUNT,
        tokenMint: tokenMint,
        userSharesAta: sharesAta,
        sharesMint: sharesMint,
        tokenProgram: TOKEN_2022_PROGRAM,
        sharesTokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        klendProgram: new PublicKey(KLEND_PROGRAM),
        eventAuthority: EVENT_AUTHORITY,
        kaminoVaultProgram: new PublicKey(KAMINO_V2_PROGRAM),
      })
      .remainingAccounts(remainingAccounts)
      .rpc();

    console.log("✅ 取款成功!");
    console.log("📝 交易签名:", tx);
    console.log(`🔗 Solscan: https://solscan.io/tx/${tx}`);
    console.log(`🔗 Solana Explorer: https://explorer.solana.com/tx/${tx}`);

    // 检查最终余额
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const pyusdBalanceAfter = await connection.getTokenAccountBalance(PYUSD_ACCOUNT);
    const sharesBalanceAfter = await connection.getTokenAccountBalance(sharesAta);

    console.log("\n💰 取款后余额:");
    console.log(`  PYUSD: ${pyusdBalanceAfter.value.uiAmount}`);
    console.log(`  Shares: ${sharesBalanceAfter.value.uiAmount}`);
    
    const pyusdReceived = Number(pyusdBalanceAfter.value.uiAmount) - Number(pyusdBalanceBefore.value.uiAmount);
    console.log(`\n📊 收益情况:`);
    console.log(`  存入: 5.000000 PYUSD`);
    console.log(`  取回: ${pyusdReceived.toFixed(6)} PYUSD`);
    console.log(`  收益: ${(pyusdReceived - 5).toFixed(6)} PYUSD`);
    
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
