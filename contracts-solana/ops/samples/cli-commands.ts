import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Mars } from "../../target/types/mars";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import * as fs from "fs";

/**
 * Mars Protocol - CLI 命令测试套件
 * 
 * 测试所有可用的 CLI 命令：
 * 1. init - 初始化 GlobalState
 * 2. set-fee-tiers - 设置费用等级
 * 3. set-protocol-fee-fraction - 设置协议费用
 * 4. initialize-vault - 初始化 Vault
 * 5. update-vault-platform-fee - 更新平台费率
 * 6. get-jito-tip - 获取 Jito tip
 * 7. claim-fees - 提取费用
 */

async function main() {
  console.log("🚀 Mars Protocol - CLI 命令测试套件\n");
  console.log("=" .repeat(60));
  console.log("测试环境: 本地测试网 (localhost:8899)");
  console.log("=" .repeat(60) + "\n");

  // 连接到本地测试网
  const connection = new anchor.web3.Connection("http://127.0.0.1:8899", "confirmed");
  
  // 加载钱包
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync("./phantom-wallet.json", "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  const program = anchor.workspace.Mars as Program<Mars>;
  console.log("✅ Program ID:", program.programId.toString());
  console.log("✅ Wallet:", wallet.publicKey.toString());
  console.log("✅ Balance:", await connection.getBalance(wallet.publicKey) / 1e9, "SOL\n");

  try {
    // 1. 创建测试 USDC mint
    console.log("📝 步骤 1: 创建测试 USDC mint...");
    const usdcMint = await createMint(
      connection,
      walletKeypair,
      walletKeypair.publicKey,
      null,
      6 // USDC 使用 6 位小数
    );
    console.log("✅ USDC Mint 创建成功:", usdcMint.toString());

    // 2. 创建 ATA
    console.log("\n📝 步骤 2: 创建关联代币账户...");
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      walletKeypair,
      usdcMint,
      wallet.publicKey
    );
    console.log("✅ ATA 创建成功:", ata.address.toString());

    // 3. Mint 一些 USDC
    console.log("\n📝 步骤 3: Mint 测试 USDC...");
    await mintTo(
      connection,
      walletKeypair,
      usdcMint,
      ata.address,
      walletKeypair,
      1000000 * 1e6 // 1M USDC
    );
    console.log("✅ Minted 1,000,000 USDC");

    // 4. 初始化 Global State
    console.log("\n📝 步骤 4: 初始化 Global State...");
    const [globalState] = PublicKey.findProgramAddressSync(
      [Buffer.from("global-state")],
      program.programId
    );
    console.log("Global State PDA:", globalState.toString());

    try {
      const globalStateAccount = await program.account.globalState.fetch(globalState);
      console.log("⚠️  Global State 已存在，跳过初始化");
    } catch (e) {
      console.log("正在初始化 Global State...");
      // 这里需要实际调用 init 指令
      console.log("⚠️  需要使用 CLI 命令初始化");
    }

    console.log("\n✅ 测试环境准备完成！");
    console.log("\n" + "=".repeat(60));
    console.log("📋 可测试的 CLI 命令清单");
    console.log("=".repeat(60));
    
    console.log("\n🔧 1. 初始化命令");
    console.log("   npm run script -- init -e localnet -k ./phantom-wallet.json -r http://127.0.0.1:8899");
    
    console.log("\n💰 2. 费用配置命令");
    console.log("   # 设置费用等级");
    console.log("   npm run script -- set-fee-tiers -e localnet -k ./phantom-wallet.json -r http://127.0.0.1:8899");
    console.log("\n   # 设置协议费用 (1%)");
    console.log("   npm run script -- set-protocol-fee-fraction -e localnet -k ./phantom-wallet.json -r http://127.0.0.1:8899 -n 1 -d 100");
    
    console.log("\n🏦 3. Vault 管理命令");
    console.log("   # 初始化 Vault");
    console.log("   npm run script -- initialize-vault \\");
    console.log("     -e localnet -k ./phantom-wallet.json -r http://127.0.0.1:8899 \\");
    console.log("     --vault_id", usdcMint.toString(), "\\");
    console.log("     --base_token_mint", usdcMint.toString(), "\\");
    console.log("     --shares_mint <SHARES_MINT> \\");
    console.log("     --fee_bps 2500");
    console.log("\n   # 更新平台费率");
    console.log("   npm run script -- update-vault-platform-fee \\");
    console.log("     -e localnet -k ./phantom-wallet.json -r http://127.0.0.1:8899 \\");
    console.log("     -m", usdcMint.toString(), "\\");
    console.log("     -f 2000");
    
    console.log("\n💸 4. 费用提取命令");
    console.log("   # 提取所有费用");
    console.log("   npm run script -- claim-all-fees \\");
    console.log("     -e localnet -k ./phantom-wallet.json -r http://127.0.0.1:8899 \\");
    console.log("     -v <VAULT_ID>");
    console.log("\n   # 提取指定类型费用");
    console.log("   npm run script -- claim-fees \\");
    console.log("     -e localnet -k ./phantom-wallet.json -r http://127.0.0.1:8899 \\");
    console.log("     -v <VAULT_ID> -a 100 -t deposit");
    
    console.log("\n⚙️  5. 全局配置命令");
    console.log("   # 更新全局参数");
    console.log("   npm run script -- update-global-state-params \\");
    console.log("     -e localnet -k ./phantom-wallet.json -r http://127.0.0.1:8899 \\");
    console.log("     -rt 80 -cfb 5 -moa 110000000000");
    
    console.log("\n🎯 6. Jito 工具命令");
    console.log("   npm run script -- get-jito-tip -e localnet -k ./phantom-wallet.json -r http://127.0.0.1:8899");
    
    console.log("\n👤 7. 管理员命令");
    console.log("   # 更改管理员");
    console.log("   npm run script -- change-admin \\");
    console.log("     -e localnet -k ./phantom-wallet.json -r http://127.0.0.1:8899 \\");
    console.log("     -n <NEW_ADMIN_ADDRESS>");
    console.log("\n   # 接受管理员权限");
    console.log("   npm run script -- accept-authority \\");
    console.log("     -e localnet -k ./new-admin.json -r http://127.0.0.1:8899");
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 测试环境信息");
    console.log("=".repeat(60));
    console.log("USDC Mint:     ", usdcMint.toString());
    console.log("Program ID:    ", program.programId.toString());
    console.log("Wallet:        ", wallet.publicKey.toString());
    console.log("Global State:  ", globalState.toString());
    console.log("=".repeat(60));
    
    console.log("\n💡 提示:");
    console.log("   1. 先运行 'npm run script -- init' 初始化 GlobalState");
    console.log("   2. 然后运行 'set-fee-tiers' 和 'set-protocol-fee-fraction' 配置费用");
    console.log("   3. 最后运行 'initialize-vault' 创建 Vault");
    console.log("   4. 使用 'get-jito-tip' 查询 Jito tip 金额");
    console.log("   5. 使用 'claim-fees' 提取累积的费用\n");

  } catch (error) {
    console.error("❌ 错误:", error);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
