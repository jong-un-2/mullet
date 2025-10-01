import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Mars } from "./target/types/mars";
import { 
    TOKEN_PROGRAM_ID, 
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
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
const MARS_PROGRAM_ID = new PublicKey("FA11bwhCyQA1xqKGv9c9VuSYiWB6EJTeupbYpJwEtvJY"); // 最新部署

// Helius RPC
const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3";

async function testKaminoMainnet() {
    console.log("🚀 开始 Kamino 主网集成测试...");
    console.log("=" .repeat(60));
    
    // 连接到主网
    const connection = new Connection(RPC_URL, "confirmed");
    
    // 加载钱包
    const walletKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync('./user.json', 'utf8')))
    );
    
    console.log("📋 测试信息:");
    console.log("  钱包地址:", walletKeypair.publicKey.toString());
    console.log("  Mars 程序:", MARS_PROGRAM_ID.toString());
    console.log("  Kamino V2 程序:", KAMINO_V2_PROGRAM.toString());
    console.log("  Klend 程序:", KLEND_PROGRAM.toString());
    console.log("  网络: Solana Mainnet Beta");
    console.log("=" .repeat(60));
    
    // 检查 SOL 余额
    const balance = await connection.getBalance(walletKeypair.publicKey);
    console.log("\n💰 余额检查:");
    console.log("  SOL 余额:", (balance / 1e9).toFixed(4), "SOL");
    
    if (balance < 0.01 * 1e9) {
        console.log("❌ SOL 余额不足，需要至少 0.01 SOL 进行测试");
        return;
    }
    console.log("✅ SOL 余额充足");
    
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
    
    console.log("\n📋 程序验证:");
    console.log("  程序 ID:", program.programId.toString());
    
    // 验证程序已部署
    const programAccount = await connection.getAccountInfo(program.programId);
    if (!programAccount) {
        console.log("❌ Mars 程序未找到");
        return;
    }
    console.log("✅ Mars 程序已部署");
    console.log("  可执行:", programAccount.executable);
    console.log("  所有者:", programAccount.owner.toString());
    
    // 验证 Kamino V2 程序
    const kaminoAccount = await connection.getAccountInfo(KAMINO_V2_PROGRAM);
    if (!kaminoAccount) {
        console.log("❌ Kamino V2 程序未找到");
        return;
    }
    console.log("✅ Kamino V2 程序可访问");
    
    // 获取用户 USDC ATA
    const userUsdcAta = await getAssociatedTokenAddress(
        USDC_MINT,
        walletKeypair.publicKey
    );
    
    console.log("\n🪙 代币账户检查:");
    console.log("  USDC Mint:", USDC_MINT.toString());
    console.log("  用户 USDC ATA:", userUsdcAta.toString());
    
    try {
        const usdcAccountInfo = await connection.getTokenAccountBalance(userUsdcAta);
        const usdcBalance = parseFloat(usdcAccountInfo.value.amount) / 1e6;
        console.log("  USDC 余额:", usdcBalance.toFixed(2), "USDC");
        
        if (usdcBalance < 0.1) {
            console.log("⚠️  USDC 余额较低，建议至少 1 USDC 进行测试");
        } else {
            console.log("✅ USDC 余额充足");
        }
    } catch (e) {
        console.log("❌ USDC 账户不存在或无余额");
        console.log("  提示: 需要先获取一些 USDC 用于测试");
    }
    
    // 列出可用的 Kamino 方法
    console.log("\n🎯 可用的 Kamino 集成方法:");
    const methods = Object.keys(program.methods);
    const kaminoMethods = methods.filter(m => 
        m.toLowerCase().includes('kamino')
    );
    
    if (kaminoMethods.length > 0) {
        kaminoMethods.forEach((method, i) => {
            console.log(`  ${i + 1}. ${method}`);
        });
        console.log("✅ Kamino 集成方法已就绪");
    } else {
        console.log("❌ 未找到 Kamino 相关方法");
    }
    
    // 显示所有可用方法（前10个）
    console.log("\n📚 所有可用方法 (前10个):");
    methods.slice(0, 10).forEach((method, i) => {
        console.log(`  ${i + 1}. ${method}`);
    });
    if (methods.length > 10) {
        console.log(`  ... 还有 ${methods.length - 10} 个方法`);
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 主网连接测试完成！");
    console.log("=".repeat(60));
    
    console.log("\n📝 后续步骤:");
    console.log("  1. 确保 USDC 账户有足够余额");
    console.log("  2. 测试 kamino_deposit 存款功能");
    console.log("  3. 测试 kamino_withdraw 取款功能");
    console.log("  4. 监控交易状态和余额变化");
    
    console.log("\n💡 提示:");
    console.log("  - 建议先用小额测试 (如 0.1 USDC)");
    console.log("  - 每次操作后检查余额变化");
    console.log("  - 保存交易签名用于追踪");
}

// 运行测试
testKaminoMainnet()
    .then(() => {
        console.log("\n✅ 测试脚本执行完毕");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ 测试失败:");
        console.error(error);
        process.exit(1);
    });
