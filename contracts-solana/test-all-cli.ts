import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Mars } from "./target/types/mars";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import * as fs from "fs";

async function main() {
  console.log("🚀 开始测试所有CLI命令...\n");

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
    console.log("\n现在可以测试以下 CLI 命令:");
    console.log("1. npm run script -- init -e localnet -k ./phantom-wallet.json -r http://127.0.0.1:8899");
    console.log("2. npm run script -- get-jito-tip -e localnet -k ./phantom-wallet.json -r http://127.0.0.1:8899");
    console.log("3. npm run script -- update-vault-platform-fee -e localnet -k ./phantom-wallet.json -r http://127.0.0.1:8899 -m", usdcMint.toString(), "-f 2500");
    
    console.log("\n📊 测试信息:");
    console.log("USDC Mint:", usdcMint.toString());
    console.log("Program ID:", program.programId.toString());
    console.log("Wallet:", wallet.publicKey.toString());

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
