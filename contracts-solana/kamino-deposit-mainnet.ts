import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Mars } from "./target/types/mars";
import { 
    TOKEN_PROGRAM_ID, 
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    getAccount,
} from "@solana/spl-token";
import { 
    Connection, 
    Keypair, 
    PublicKey, 
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import * as fs from "fs";

// 主网常量
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const KAMINO_V2_PROGRAM = new PublicKey("KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd"); // Kamino V2
const KLEND_PROGRAM = new PublicKey("KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD");
const MARS_PROGRAM_ID = new PublicKey("FA11bwhCyQA1xqKGv9c9VuSYiWB6EJTeupbYpJwEtvJY");

// Kamino USDC Vault 信息 (主网)
// 注意: 这些是示例地址，需要使用真实的 Kamino USDC vault 地址
const KAMINO_USDC_VAULT_STATE = new PublicKey("3uxNepDbw7kaoFVVASr6gV9YUBM42Z3knWEMd7JKKzLs"); // 示例
const KAMINO_USDC_VAULT_TOKEN_ACCOUNT = new PublicKey("4vg9vsHMLwGKQPJrpaMJzSR1pFGDpg7m7xKB8UKr4RaT"); // 示例  
const KAMINO_USDC_SHARES_MINT = new PublicKey("7i3p2G4tDVqST7iPZAVU2AXhgCBkNqBXUNMsLzxDdUqY"); // 示例

// Helius RPC
const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3";

async function depositToKamino() {
    console.log("🚀 开始 Kamino 主网存款测试...");
    console.log("=" .repeat(70));
    
    // 连接到主网
    const connection = new Connection(RPC_URL, "confirmed");
    
    // 加载钱包
    const walletKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync('./user.json', 'utf8')))
    );
    
    console.log("📋 测试信息:");
    console.log("  钱包地址:", walletKeypair.publicKey.toString());
    console.log("  Mars 程序:", MARS_PROGRAM_ID.toString());
    console.log("  Kamino 程序:", KAMINO_PROGRAM_ID.toString());
    console.log("=" .repeat(70));
    
    // 检查余额
    const balance = await connection.getBalance(walletKeypair.publicKey);
    console.log("\n💰 余额检查:");
    console.log("  SOL 余额:", (balance / 1e9).toFixed(4), "SOL");
    
    if (balance < 0.02 * 1e9) {
        throw new Error("SOL 余额不足，需要至少 0.02 SOL");
    }
    
    // 设置 Anchor
    const provider = new anchor.AnchorProvider(
        connection, 
        new anchor.Wallet(walletKeypair), 
        { commitment: "confirmed" }
    );
    anchor.setProvider(provider);
    
    // 加载程序
    const idl = JSON.parse(fs.readFileSync('./target/idl/mars.json', 'utf8'));
    const program = new Program(idl, provider) as Program<Mars>;
    
    // 获取用户 USDC ATA
    const userUsdcAta = await getAssociatedTokenAddress(
        USDC_MINT,
        walletKeypair.publicKey
    );
    
    console.log("\n🪙 代币账户:");
    console.log("  用户 USDC ATA:", userUsdcAta.toString());
    
    // 检查 USDC 余额
    let usdcBalance: number;
    try {
        const usdcAccountInfo = await connection.getTokenAccountBalance(userUsdcAta);
        usdcBalance = parseFloat(usdcAccountInfo.value.amount) / 1e6;
        console.log("  USDC 余额:", usdcBalance.toFixed(2), "USDC");
        
        if (usdcBalance < 0.1) {
            throw new Error("USDC 余额不足，需要至少 0.1 USDC");
        }
    } catch (error) {
        throw new Error("无法获取 USDC 余额: " + error.message);
    }
    
    // 获取或创建用户的 Kamino 份额账户
    const userSharesAccount = await getAssociatedTokenAddress(
        KAMINO_USDC_SHARES_MINT,
        walletKeypair.publicKey
    );
    
    console.log("  用户份额账户:", userSharesAccount.toString());
    
    // 检查份额账户是否存在
    try {
        await getAccount(connection, userSharesAccount);
        console.log("  ✅ 份额账户已存在");
    } catch (error) {
        console.log("  ⚠️  份额账户不存在，需要先创建");
        console.log("  提示: 首次存款时会自动创建份额账户");
    }
    
    // 存款金额
    const depositAmount = new anchor.BN(0.1 * 1e6); // 0.1 USDC (测试用小额)
    console.log("\n💰 存款计划:");
    console.log("  存款金额:", (depositAmount.toNumber() / 1e6).toFixed(2), "USDC");
    console.log("  目标: Kamino USDC Vault");
    
    console.log("\n⚠️  重要提示:");
    console.log("  此脚本使用示例 Kamino vault 地址");
    console.log("  在实际使用前，请先:");
    console.log("  1. 访问 https://app.kamino.finance/");
    console.log("  2. 找到 USDC 流动性池");
    console.log("  3. 获取正确的 vault state、token account 和 shares mint 地址");
    console.log("  4. 更新脚本中的地址");
    
    console.log("\n📋 Kamino Vault 信息 (请验证):");
    console.log("  Vault State:", KAMINO_USDC_VAULT_STATE.toString());
    console.log("  Vault Token Account:", KAMINO_USDC_VAULT_TOKEN_ACCOUNT.toString());
    console.log("  Shares Mint:", KAMINO_USDC_SHARES_MINT.toString());
    
    console.log("\n⏸️  暂停执行 - 请确认上述地址正确后继续...");
    console.log("  (要继续执行，请取消下面的 return 语句)");
    
    // 取消下面这行来实际执行存款
    return;
    
    try {
        console.log("\n🚀 执行 Kamino 存款...");
        
        const tx = await program.methods
            .kaminoDeposit(depositAmount)
            .accounts({
                user: walletKeypair.publicKey,
                userTokenAccount: userUsdcAta,
                userSharesAccount: userSharesAccount,
                kaminoVaultState: KAMINO_USDC_VAULT_STATE,
                kaminoVaultTokenAccount: KAMINO_USDC_VAULT_TOKEN_ACCOUNT,
                kaminoSharesMint: KAMINO_USDC_SHARES_MINT,
                kaminoVaultProgram: KAMINO_PROGRAM_ID,
            })
            .rpc();
        
        console.log("\n✅ Kamino 存款成功!");
        console.log("📋 交易签名:", tx);
        console.log("🔗 Solscan:", `https://solscan.io/tx/${tx}`);
        console.log("🔗 Solana Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=mainnet`);
        
        // 等待确认
        await connection.confirmTransaction(tx);
        console.log("✅ 交易已确认");
        
        // 检查更新后的余额
        const newUsdcBalance = await connection.getTokenAccountBalance(userUsdcAta);
        console.log("\n💰 更新后的余额:");
        console.log("  USDC:", (parseFloat(newUsdcBalance.value.amount) / 1e6).toFixed(2), "USDC");
        
        try {
            const sharesBalance = await connection.getTokenAccountBalance(userSharesAccount);
            console.log("  Kamino 份额:", (parseFloat(sharesBalance.value.amount) / 1e6).toFixed(6));
        } catch (e) {
            console.log("  Kamino 份额: (账户未创建或查询失败)");
        }
        
        console.log("\n🎉 Kamino 存款流程完成!");
        
        return {
            transaction: tx,
            amount: depositAmount.toNumber() / 1e6,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error("\n❌ 存款失败:");
        console.error("  错误:", error.message);
        if (error.logs) {
            console.error("  日志:");
            error.logs.forEach((log: string) => console.error("    ", log));
        }
        throw error;
    }
}

// 运行存款
depositToKamino()
    .then((result) => {
        if (result) {
            console.log("\n" + "=".repeat(70));
            console.log("📊 存款结果:");
            console.log("  交易签名:", result.transaction);
            console.log("  存款金额:", result.amount, "USDC");
            console.log("  时间:", result.timestamp);
            console.log("=".repeat(70));
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ 脚本执行失败");
        process.exit(1);
    });
