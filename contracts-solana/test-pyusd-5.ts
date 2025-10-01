import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Mars } from "./target/types/mars";
import { 
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    getAssociatedTokenAddress,
} from "@solana/spl-token";
import { 
    Connection, 
    Keypair, 
    PublicKey,
    AccountMeta,
} from "@solana/web3.js";
import * as fs from "fs";
import { HELIUS_RPC, MARS_PROGRAM_ID, KAMINO_V2_PROGRAM, KLEND_PROGRAM, PYUSD_MINT } from "./constants";

// 实际的 PYUSD 账户地址（从交易中获取 - Token-2022）
const PYUSD_ACCOUNT = new PublicKey("DhxxxG3fouc2j9f5AUVqM9M3GHCQydnSeUxXkwJWb3y6");

// Token-2022 Program ID
const TOKEN_2022_PROGRAM = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

// Kamino Vault 地址（SDK 例子中使用的）
const VAULT_ADDRESS = new PublicKey("A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK");

async function test() {
    console.log("🚀 Mars合约 PYUSD Kamino Deposit 测试 (5 PYUSD)\n");
    
    const connection = new Connection(HELIUS_RPC, "confirmed");
    
    // 加载钱包
    const walletKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync('./user.json', 'utf8')))
    );
    
    console.log("📋 钱包地址:", walletKeypair.publicKey.toString());
    console.log("📋 Mars程序ID:", MARS_PROGRAM_ID.toString());
    console.log("📋 PYUSD Mint:", PYUSD_MINT.toString());
    console.log("📋 PYUSD 账户:", PYUSD_ACCOUNT.toString());
    console.log("");
    
    // 检查 SOL 余额
    const balance = await connection.getBalance(walletKeypair.publicKey);
    console.log("💰 SOL余额:", (balance / 1e9).toFixed(4), "SOL");
    
    // 检查 PYUSD 余额
    const pyusdBalance = await connection.getTokenAccountBalance(PYUSD_ACCOUNT);
    console.log("💰 PYUSD 余额:", pyusdBalance.value.uiAmountString, "PYUSD\n");
    
    if (parseFloat(pyusdBalance.value.uiAmountString || "0") < 5) {
        throw new Error("❌ PYUSD 余额不足，需要至少 5 PYUSD");
    }
    
    // 获取 Vault 信息
    console.log("🔍 检查 Kamino Vault...");
    console.log("Vault:", VAULT_ADDRESS.toString(), "\n");
    
    const vaultInfo = await connection.getAccountInfo(VAULT_ADDRESS);
    
    if (!vaultInfo) {
        throw new Error("❌ Vault 不存在");
    }
    
    if (!vaultInfo.owner.equals(KAMINO_V2_PROGRAM)) {
        throw new Error("❌ 不是有效的 Kamino V2 Vault");
    }
    
    // ✨ 按照 VaultState IDL 正确解析（从 Kamino SDK IDL 确认）
    const data = vaultInfo.data;
    let offset = 8; // 跳过 discriminator
    
    // vaultAdminAuthority
    offset += 32;
    
    // baseVaultAuthority (offset 40)
    const baseVaultAuthority = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // baseVaultAuthorityBump (8 bytes)
    offset += 8;
    
    // tokenMint (offset 80)
    const tokenMint = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // tokenMintDecimals (8 bytes)
    offset += 8;
    
    // tokenVault (offset 120)
    const tokenVault = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // tokenProgram (offset 152)
    const tokenProgram = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // sharesMint (offset 184)
    const sharesMint = new PublicKey(data.slice(offset, offset + 32));
    
    console.log("📋 Vault 信息:");
    console.log("  Token Mint (PYUSD):", tokenMint.toString());
    console.log("  Token Vault:", tokenVault.toString());
    console.log("  Token Program:", tokenProgram.toString(), "(Token-2022 ✨)");
    console.log("  Shares Mint:", sharesMint.toString());
    console.log("  Base Authority:", baseVaultAuthority.toString());
    
    // 计算 eventAuthority PDA
    const [eventAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("__event_authority")],
        KAMINO_V2_PROGRAM
    );
    console.log("  Event Authority:", eventAuthority.toString());
    
    // 获取 shares ATA (标准 Token program)
    const userSharesAta = await getAssociatedTokenAddress(sharesMint, walletKeypair.publicKey);
    
    console.log("\n📋 用户账户:");
    console.log("  PYUSD Token:", PYUSD_ACCOUNT.toString());
    console.log("  Shares ATA:", userSharesAta.toString());
    
    // 🔍 获取 Vault Reserves (remaining_accounts)
    console.log("\n🔍 获取 Vault Reserves...");
    
    // VaultAllocationStrategy 从 offset 320 开始，固定数组 [VaultAllocation; 25]
    let reserveOffset = 320;
    const allocationCount = 25;
    const reserves: PublicKey[] = [];
    
    for (let i = 0; i < allocationCount; i++) {
        // VaultAllocation: reserve(32) + ctokenVault(32) + targetAllocationWeight(8) + tokenAllocationCap(8) = 80 bytes
        const reserve = new PublicKey(data.slice(reserveOffset, reserveOffset + 32));
        
        if (!reserve.equals(PublicKey.default)) {
            reserves.push(reserve);
        }
        
        reserveOffset += 80;
    }
    
    console.log(`  找到 ${reserves.length} 个 reserves`);
    
  // 构造 remaining accounts (SDK 格式: 先所有 reserves，再所有 lending markets)
  const remainingAccounts: AccountMeta[] = [];
  const reserveAccounts = await connection.getMultipleAccountsInfo(reserves);
  
  const lendingMarkets: PublicKey[] = [];
  
  // Step 1: 添加所有 reserves (writable)
  for (let i = 0; i < reserves.length; i++) {
    const reserveAccount = reserveAccounts[i];
    if (reserveAccount) {
      remainingAccounts.push({
        pubkey: reserves[i],
        isSigner: false,
        isWritable: true
      });
      
      // 从 reserve 数据中提取 lending market (offset 16: discriminator 8 + version 8)
      const lendingMarket = new PublicKey(reserveAccount.data.slice(16, 48));
      lendingMarkets.push(lendingMarket);
    }
  }
  
  // Step 2: 添加所有 lending markets (readonly)
  for (const lendingMarket of lendingMarkets) {
    remainingAccounts.push({
      pubkey: lendingMarket,
      isSigner: false,
      isWritable: false
    });
  }    console.log(`\n✅ 准备 ${remainingAccounts.length} 个 remaining accounts`);
    
    // 设置 Anchor
    const provider = new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(walletKeypair),
        { commitment: "confirmed" }
    );
    anchor.setProvider(provider);
    
    const idl = JSON.parse(fs.readFileSync('./target/idl/mars.json', 'utf8'));
    const program = new Program(idl, provider) as Program<Mars>;
    
    console.log("⚠️  注意: Shares ATA 已创建\n");
    
    // 存款金额: 5 PYUSD = 5,000,000 micro-units (6 decimals)
    const depositAmount = new anchor.BN(5_000_000);
    console.log("💰 存款金额:", depositAmount.toString(), "micro-units (5 PYUSD)");
    console.log("\n🚀 调用 Mars 合约的 kamino_deposit...\n");
    
    try {
        const tx = await (program.methods as any)
            .kaminoDeposit(depositAmount)
            .accounts({
                user: walletKeypair.publicKey,
                vaultState: VAULT_ADDRESS,
                tokenVault: tokenVault,
                tokenMint: tokenMint,
                baseVaultAuthority: baseVaultAuthority,
                sharesMint: sharesMint,
                userTokenAta: PYUSD_ACCOUNT,  // 使用实际的 PYUSD 账户 (Token-2022)
                userSharesAta: userSharesAta,
                klendProgram: KLEND_PROGRAM,
                tokenProgram: tokenProgram,  // ✨ 从 vault 读取（Token-2022）
                sharesTokenProgram: TOKEN_PROGRAM_ID,  // Shares 使用标准 Token program
                eventAuthority: eventAuthority,
                kaminoVaultProgram: KAMINO_V2_PROGRAM,
            })
            .remainingAccounts(remainingAccounts)  // ✨ 添加 vault reserves 和 lending markets
            .rpc();
        
        console.log("✅ 交易成功!");
        console.log("📋 签名:", tx);
        console.log("🔗 Solscan:", `https://solscan.io/tx/${tx}`);
        console.log("");
        
        await connection.confirmTransaction(tx, "confirmed");
        console.log("✅ 交易已确认!");
        
        // 检查新余额
        const newBalance = await connection.getTokenAccountBalance(PYUSD_ACCOUNT);
        console.log("\n💰 新的 PYUSD 余额:", newBalance.value.uiAmountString, "PYUSD");
        
    } catch (error: any) {
        console.error("\n❌ 交易失败:", error.message);
        
        if (error.logs) {
            console.log("\n📜 交易日志:");
            error.logs.forEach((log: string) => console.log("  ", log));
        }
        
        throw error;
    }
}

test()
    .then(() => {
        console.log("\n🎉 测试完成!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ 测试失败:", error.message);
        process.exit(1);
    });
