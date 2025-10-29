import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Mars } from "../../target/types/mars";
import { 
    TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { 
    Connection, 
    Keypair, 
    PublicKey,
    AccountMeta,
    ComputeBudgetProgram,
} from "@solana/web3.js";
import * as fs from "fs";
import Decimal from "decimal.js/decimal";
import { HELIUS_RPC, MARS_PROGRAM_ID, KAMINO_V2_PROGRAM, KLEND_PROGRAM, PYUSD_MINT } from "../utils/constants";
import { KaminoSDKHelper } from "../utils/sdk-helper";

// 实际的 PYUSD 账户地址
const PYUSD_ACCOUNT = new PublicKey("DhxxxG3fouc2j9f5AUVqM9M3GHCQydnSeUxXkwJWb3y6");

// Token-2022 Program ID
const TOKEN_2022_PROGRAM = TOKEN_2022_PROGRAM_ID;

// Kamino Vault 地址
const VAULT_ADDRESS = new PublicKey("A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK");

// Event Authority
const EVENT_AUTHORITY = new PublicKey("24tHwQyJJ9akVXxnvkekGfAoeUJXXS7mE6kQNioNySsK");

// Kamino Farms Program
const FARMS_PROGRAM = new PublicKey("FarmsPZpWu9i7Kky8tPN37rs2TpmMrAZrC7S7vJa91Hr");

// Farm 相关账户（从 SDK 获取）
const FARM_STATE = new PublicKey("HtN9eg6qmjPdoRAWXAdMhGe6BJNDDTynGBPvBj2mzEW7");
const USER_FARM = new PublicKey("8hznHD38esVyPps3hUcFahynwekYUfjn43PRz9n5PDZN");
const DELEGATED_STAKE = new PublicKey("HkUp6TWz3joUECDZgAiJWkK9D9WAuHsRzVuuSqJpptrF");
const SCOPE_PRICES = new PublicKey("GQRzZVLkmehJM1fnMj8e8DdhxMPmQBEGiSnSWeVeJvCc");

async function main() {
  console.log("🚀 Mars合约 PYUSD 取消质押并取款测试\n");

  // 连接到 Solana
  const connection = new Connection(HELIUS_RPC, "confirmed");

  // 加载钱包
  const walletPath = "./phantom-wallet.json";
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));

  console.log("📋 钱包地址:", wallet.publicKey.toBase58());
  console.log("📋 Mars程序ID:", MARS_PROGRAM_ID);

  // 检查余额
  const solBalance = await connection.getBalance(wallet.publicKey);
  console.log(`\n💰 SOL余额: ${(solBalance / 1e9).toFixed(4)} SOL`);

  const pyusdBalanceBefore = await connection.getTokenAccountBalance(PYUSD_ACCOUNT);
  console.log(`💰 PYUSD 余额: ${pyusdBalanceBefore.value.uiAmount} PYUSD`);

  // 🎯 Vault 相关账户
  const tokenVault = new PublicKey('88ErUYiVu1nmf2VSptraaBewFeBqgXmN9n9xp2U5z1A2');
  const tokenMint = new PublicKey('2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo');
  const baseAuthority = new PublicKey('A8dytfD3E8niG872SJYhwuXV5xmTyozzFKYzhn3zL2wG');
  const sharesMint = new PublicKey('DCqyVY1SFCwq8unnexv9pjujVAC7jsmjfoUWBrNLvbY');
  const sharesAta = new PublicKey('6rJuqfyCBEms6BTBtN6W1M3NB44k6YhmAY8TAqnpYtKq');

  console.log("\n📋 Vault 账户:");
  console.log("  Vault State:", VAULT_ADDRESS.toBase58());
  console.log("  Shares ATA:", sharesAta.toBase58());

  console.log("\n📋 Farm 账户:");
  console.log("  Farm State:", FARM_STATE.toBase58());
  console.log("  User Farm:", USER_FARM.toBase58());
  console.log("  Delegated Stake:", DELEGATED_STAKE.toBase58());

  // 检查 User Farm 账户获取质押数量
  console.log("\n🔍 检查 Farm 质押状态...");
  const userFarmAccount = await connection.getAccountInfo(USER_FARM);
  if (!userFarmAccount) {
    console.log("❌ User Farm 账户不存在，可能没有质押");
    return;
  }
  console.log("✅ User Farm 账户存在，有质押的 shares");

  // 检查钱包中的 shares
  const sharesBalance = await connection.getTokenAccountBalance(sharesAta);
  console.log(`💎 钱包中的 Shares: ${sharesBalance.value.uiAmount || 0} shares`);

  // 设置 Anchor
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );

  anchor.setProvider(provider);
  const program = anchor.workspace.Mars as Program<Mars>;

  // 增加 Compute Units
  const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
    units: 300_000
  });

  console.log("\n" + "=".repeat(60));
  console.log("第一步：发起 Farm 取消质押请求 (StartUnstake)");
  console.log("=".repeat(60));

  try {
    // 获取当前 slot
    const currentSlot = await connection.getSlot();
    console.log(`📍 当前 Slot: ${currentSlot}`);

    // 第一步：发起取消质押请求
    const startUnstakeTx = await program.methods
      .kaminoStartUnstakeFromFarm(
        new anchor.BN(Number.MAX_SAFE_INTEGER), // 取消质押全部
        new anchor.BN(currentSlot)
      )
      .accounts({
        user: wallet.publicKey,
        farmState: FARM_STATE,
        userFarm: USER_FARM,
        farmsProgram: FARMS_PROGRAM,
      })
      .preInstructions([modifyComputeUnits])
      .rpc();

    console.log("✅ StartUnstake 成功!");
    console.log("📝 StartUnstake 交易签名:", startUnstakeTx);
    console.log(`🔗 Solscan: https://solscan.io/tx/${startUnstakeTx}`);

    // 等待确认
    await new Promise((resolve) => setTimeout(resolve, 3000));
  } catch (error: any) {
    if (error.message?.includes("NothingToUnstake")) {
      console.log("⏭️  跳过 StartUnstake - 已经执行过了");
    } else {
      throw error;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("第二步：从 Farm 提取已取消质押的 shares");
  console.log("=".repeat(60));

  try {
    // 第二步：从 Farm 取消质押（提取到钱包）
    const unstakeTx = await program.methods
      .kaminoUnstakeFromFarm()
      .accounts({
        user: wallet.publicKey,
        farmState: FARM_STATE,
        userFarm: USER_FARM,
        userSharesAta: sharesAta,
        delegatedStake: DELEGATED_STAKE,
        scopePrices: SCOPE_PRICES,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        farmsProgram: FARMS_PROGRAM,
      })
      .preInstructions([modifyComputeUnits])
      .rpc();

    console.log("✅ WithdrawUnstakedDeposits 成功!");
    console.log("📝 Unstake 交易签名:", unstakeTx);
    console.log(`🔗 Solscan: https://solscan.io/tx/${unstakeTx}`);

    // 等待确认
    await new Promise((resolve) => setTimeout(resolve, 3000));
  } catch (error: any) {
    if (error.message?.includes("NothingToWithdraw")) {
      console.log("⏭️  跳过 WithdrawUnstakedDeposits - 已经执行过了");
    } else {
      throw error;
    }
  }

  // 检查取消质押后的 shares
  const sharesAfterUnstake = await connection.getTokenAccountBalance(sharesAta);
  console.log(`💎 取消质押后的 Shares: ${sharesAfterUnstake.value.uiAmount} shares`);

  if (Number(sharesAfterUnstake.value.amount) === 0) {
    console.log("⚠️  钱包中没有 shares，无法继续取款");
    return;
  }

  console.log("\n" + "=".repeat(60));
  console.log("第三步：从 Vault 取款");
  console.log("=".repeat(60));

  try {
    const withdrawSharesAmount = sharesAfterUnstake.value.amount;
    console.log(`💰 取款 ${sharesAfterUnstake.value.uiAmount} shares`);

    // 使用 SDK Helper 动态获取取款所需的账户
    console.log("\n⏳ 从 SDK 获取取款账户信息...");
    const sdkHelper = new KaminoSDKHelper("./phantom-wallet.json");
    await sdkHelper.initialize();
    
    const withdrawInfo = await sdkHelper.getWithdrawInstructionInfo(
      VAULT_ADDRESS.toBase58(),
      new Decimal(sharesAfterUnstake.value.uiAmount || 0)
    );
    
    const { vaultAccounts, remainingAccounts } = withdrawInfo;
    
    console.log("✅ 获取到取款账户信息");
    console.log(`� Remaining accounts: ${remainingAccounts.length} 个账户`);

    const withdrawTx = await program.methods
      .kaminoWithdraw(new anchor.BN(withdrawSharesAmount))
      .accounts({
        user: wallet.publicKey,
        vaultState: VAULT_ADDRESS,
        tokenVault: vaultAccounts.tokenVault,
        baseVaultAuthority: vaultAccounts.baseAuthority,
        userTokenAta: PYUSD_ACCOUNT,
        tokenMint: vaultAccounts.tokenMint,
        userSharesAta: vaultAccounts.userSharesAta,
        sharesMint: vaultAccounts.sharesMint,
        tokenProgram: TOKEN_2022_PROGRAM,
        sharesTokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        klendProgram: new PublicKey(KLEND_PROGRAM),
        eventAuthority: EVENT_AUTHORITY,
        kaminoVaultProgram: new PublicKey(KAMINO_V2_PROGRAM),
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions([modifyComputeUnits])
      .rpc();

    console.log("✅ 取款成功!");
    console.log("📝 Withdraw 交易签名:", withdrawTx);
    console.log(`🔗 Solscan: https://solscan.io/tx/${withdrawTx}`);

    // 检查最终余额
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const pyusdBalanceAfter = await connection.getTokenAccountBalance(PYUSD_ACCOUNT);
    const sharesBalanceAfter = await connection.getTokenAccountBalance(vaultAccounts.userSharesAta);

    console.log("\n" + "=".repeat(60));
    console.log("最终余额");
    console.log("=".repeat(60));
    console.log(`💰 PYUSD: ${pyusdBalanceAfter.value.uiAmount}`);
    console.log(`💎 Shares: ${sharesBalanceAfter.value.uiAmount || 0}`);

    const pyusdReceived = Number(pyusdBalanceAfter.value.uiAmount) - Number(pyusdBalanceBefore.value.uiAmount);
    console.log(`\n📊 本次取款:`);
    console.log(`  收回: ${pyusdReceived.toFixed(6)} PYUSD`);
    if (pyusdReceived > 2) {
      console.log(`  💰 收益: ${(pyusdReceived - 2).toFixed(6)} PYUSD`);
    }

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
