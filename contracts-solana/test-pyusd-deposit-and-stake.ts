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
    ComputeBudgetProgram,
    Transaction,
} from "@solana/web3.js";
import * as fs from "fs";
import { HELIUS_RPC, MARS_PROGRAM_ID, KAMINO_V2_PROGRAM, KLEND_PROGRAM, PYUSD_MINT } from "./constants";

// 实际的 PYUSD 账户地址（Token-2022）
const PYUSD_ACCOUNT = new PublicKey("DhxxxG3fouc2j9f5AUVqM9M3GHCQydnSeUxXkwJWb3y6");

// Token-2022 Program ID
const TOKEN_2022_PROGRAM = TOKEN_2022_PROGRAM_ID;

// Kamino Vault 地址（PYUSD vault）
const VAULT_ADDRESS = new PublicKey("A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK");

// Event Authority
const EVENT_AUTHORITY = new PublicKey("24tHwQyJJ9akVXxnvkekGfAoeUJXXS7mE6kQNioNySsK");

// Kamino Farms Program
const FARMS_PROGRAM = new PublicKey("FarmsPZpWu9i7Kky8tPN37rs2TpmMrAZrC7S7vJa91Hr");

// Farm 相关账户（从 SDK 获取）
const FARM_STATE = new PublicKey("HtN9eg6qmjPdoRAWXAdMhGe6BJNDDTynGBPvBj2mzEW7");
const USER_FARM = new PublicKey("8hznHD38esVyPps3hUcFahynwekYUfjn43PRz9n5PDZN");
const DELEGATED_STAKE = new PublicKey("HkUp6TWz3joUECDZgAiJWkK9D9WAuHsRzVuuSqJpptrF");

async function main() {
  console.log("🚀 Mars合约 PYUSD 存款并自动质押到Farm测试\n");

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

  // 🎯 Vault 相关账户（从 SDK 获取）
  console.log("\n📋 Vault 账户 (来自SDK):");
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

  console.log("\n📋 Farm 账户 (来自SDK):");
  console.log("  Farms Program:", FARMS_PROGRAM.toBase58());
  console.log("  Farm State:", FARM_STATE.toBase58());
  console.log("  User Farm:", USER_FARM.toBase58());
  console.log("  Delegated Stake:", DELEGATED_STAKE.toBase58());

  // 🎯 Remaining accounts (reserves + lending markets)
  const remainingAccounts: AccountMeta[] = [
    {
      pubkey: new PublicKey('2gc9Dm1eB6UgVYFBUN9bWks6Kes9PbWSaPaa9DqyvEiN'), // reserve
      isSigner: false,
      isWritable: true
    },
    {
      pubkey: new PublicKey('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF'), // lending market
      isSigner: false,
      isWritable: false
    }
  ];
  
  console.log("\n📋 Remaining Accounts (reserves + lending markets):");
  remainingAccounts.forEach((acc, i) => {
    const role = acc.isWritable ? 'writable' : 'readonly';
    console.log(`   ${i}: ${acc.pubkey.toBase58()} [${role}]`);
  });

  // 存款金额
  const depositAmountLamports = 1_000_000; // 1 PYUSD (6 decimals)
  console.log(`\n💰 存款金额: ${depositAmountLamports / 1_000_000} PYUSD`);

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
    // 增加 Compute Units 限额到 400,000
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 400_000
    });
    
    const tx = await program.methods
      .kaminoDepositAndStake(new anchor.BN(depositAmountLamports))
      .accounts({
        user: wallet.publicKey,
        vaultState: VAULT_ADDRESS,
        tokenVault: tokenVault,
        tokenMint: tokenMint,
        baseVaultAuthority: baseAuthority,
        sharesMint: sharesMint,
        userTokenAta: PYUSD_ACCOUNT,
        userSharesAta: sharesAta,
        klendProgram: new PublicKey(KLEND_PROGRAM),
        tokenProgram: TOKEN_2022_PROGRAM,  // PYUSD 是 Token-2022
        sharesTokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        eventAuthority: EVENT_AUTHORITY,
        kaminoVaultProgram: new PublicKey(KAMINO_V2_PROGRAM),
        farmState: FARM_STATE,
        userFarm: USER_FARM,
        delegatedStake: DELEGATED_STAKE,
        farmsProgram: FARMS_PROGRAM,
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
    const sharesBalance = await connection.getTokenAccountBalance(sharesAta);

    console.log("\n💰 交易后余额:");
    console.log(`  PYUSD: ${pyusdBalanceAfter.value.uiAmount}`);
    console.log(`  Shares (钱包): ${sharesBalance.value.uiAmount}`);
    
    console.log("\n🌐 查看你的存款:");
    console.log(`  Kamino Vault: https://kamino.finance/earn/${VAULT_ADDRESS.toBase58()}`);
    console.log(`  Kamino Farm (应该能看到了!): https://app.kamino.finance/liquidity/farms`);
    console.log(`  你的 Shares ATA: https://solscan.io/account/${sharesAta.toBase58()}`);
    console.log(`  User Farm Account: https://solscan.io/account/${USER_FARM.toBase58()}`);
    
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
