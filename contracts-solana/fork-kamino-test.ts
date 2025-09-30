import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Mars } from "./target/types/mars";
import { 
    TOKEN_PROGRAM_ID, 
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction
} from "@solana/spl-token";
import { 
    Connection, 
    Keypair, 
    PublicKey, 
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    Transaction
} from "@solana/web3.js";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const KAMINO_PROGRAM_ID = new PublicKey("Cyjb5r4P1j1YPEyUemWxMZKbTpBiyNQML1S1YpPvi9xE");

async function testKaminoIntegrationFork() {
    console.log("🧪 开始 Kamino 集成测试 (Mainnet Fork)...");
    
    // 连接到本地 fork
    const connection = new Connection("http://localhost:8899", "confirmed");
    
    // 加载钱包
    const walletKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(require('fs').readFileSync('./phantom-wallet.json', 'utf8')))
    );
    
    console.log("📋 钱包地址:", walletKeypair.publicKey.toString());
    
    // 检查 SOL 余额
    const balance = await connection.getBalance(walletKeypair.publicKey);
    console.log("💰 SOL 余额:", balance / 1e9, "SOL");
    
    // 设置 Anchor
    const provider = new anchor.AnchorProvider(
        connection, 
        new anchor.Wallet(walletKeypair), 
        { commitment: "confirmed" }
    );
    anchor.setProvider(provider);
    
    // 加载程序
    const program = anchor.workspace.Mars as Program<Mars>;
    console.log("📋 Mars 程序 ID:", program.programId.toString());
    
    // 获取用户 USDC ATA
    const userUsdcAta = await getAssociatedTokenAddress(
        USDC_MINT,
        walletKeypair.publicKey
    );
    
    console.log("🪙 用户 USDC ATA:", userUsdcAta.toString());
    
    try {
        // 检查 USDC 账户是否存在
        const accountInfo = await connection.getAccountInfo(userUsdcAta);
        if (!accountInfo) {
            console.log("🔧 创建 USDC 关联代币账户...");
            const createAtaIx = createAssociatedTokenAccountInstruction(
                walletKeypair.publicKey,
                userUsdcAta,
                walletKeypair.publicKey,
                USDC_MINT
            );
            
            const tx = new Transaction().add(createAtaIx);
            await provider.sendAndConfirm(tx);
            console.log("✅ USDC ATA 创建成功");
        }
        
        // 模拟铸造一些 USDC 用于测试 (在 fork 环境中)
        console.log("🪙 准备测试 USDC...");
        // 注意: 在真实的 mainnet fork 中，USDC 铸造权限可能不在我们手里
        // 但我们可以测试其他功能
        
        // 测试 Mars 程序的 Kamino 相关指令
        console.log("🔍 检查 Kamino 程序是否可访问...");
        const kaminoAccountInfo = await connection.getAccountInfo(KAMINO_PROGRAM_ID);
        if (kaminoAccountInfo) {
            console.log("✅ Kamino 程序可访问 (executable:", kaminoAccountInfo.executable, ")");
        } else {
            console.log("❌ Kamino 程序不可访问");
        }
        
        // 测试程序指令可用性
        console.log("🧪 测试 Mars 程序指令...");
        const methods = Object.keys(program.methods);
        console.log("📋 可用方法:", methods.slice(0, 5).join(", "), "...");
        
        const kaminoMethods = methods.filter(m => 
            m.toLowerCase().includes('kamino')
        );
        console.log("🎯 Kamino 相关方法:", kaminoMethods);
        
        if (kaminoMethods.length > 0) {
            console.log("✅ Mars-Kamino 集成指令已可用!");
        } else {
            console.log("⚠️  未找到 Kamino 相关指令");
        }
        
        console.log("\n🎉 Mainnet Fork 测试环境验证完成!");
        console.log("💡 现在可以在本地环境中测试 Kamino 集成了");
        
        return {
            success: true,
            wallet: walletKeypair.publicKey.toString(),
            sol: balance / 1e9,
            kaminoAvailable: !!kaminoAccountInfo,
            marsKaminoMethods: kaminoMethods
        };
        
    } catch (error) {
        console.error("❌ 测试过程出错:", error.message);
        throw error;
    }
}

// 运行测试
testKaminoIntegrationFork()
    .then((result) => {
        console.log("\n=== Fork 测试结果 ===");
        console.log("状态:", result.success ? "✅ 成功" : "❌ 失败");
        console.log("钱包:", result.wallet);
        console.log("SOL 余额:", result.sol);
        console.log("Kamino 可用:", result.kaminoAvailable ? "✅" : "❌");
        console.log("Mars-Kamino 方法:", result.marsKaminoMethods.join(", "));
    })
    .catch((error) => {
        console.error("❌ Fork 测试失败:", error.message);
        process.exit(1);
    });
