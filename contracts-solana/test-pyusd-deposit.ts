import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Mars } from "./target/types/mars";
import { 
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { 
    Connection, 
    Keypair, 
    PublicKey,
    Transaction,
    SystemProgram,
} from "@solana/web3.js";
import * as fs from "fs";
import { HELIUS_RPC, MARS_PROGRAM_ID, KAMINO_V2_PROGRAM, KLEND_PROGRAM, PYUSD_MINT } from "./constants";

// 使用已知的 Kamino PYUSD vault (需要验证)
const PYUSD_VAULT = new PublicKey("CfWW3fuSiTJYhdvNA8xsrzky19xTHH6wWgVUvU4RZYz4");

async function testPyusdDeposit() {
    console.log("🚀 Mars合约 PYUSD Kamino Deposit 测试\n");
    
    const connection = new Connection(HELIUS_RPC, "confirmed");
    
    // 加载钱包
    const walletKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync('./user.json', 'utf8')))
    );
    
    console.log("📋 钱包地址:", walletKeypair.publicKey.toString());
    console.log("📋 Mars程序ID:", MARS_PROGRAM_ID.toString());
    console.log("📋 PYUSD Mint:", PYUSD_MINT.toString());
    console.log("");
    
    // 检查 SOL 余额
    const balance = await connection.getBalance(walletKeypair.publicKey);
    console.log("💰 SOL余额:", (balance / 1e9).toFixed(4), "SOL");
    
    // 获取 PYUSD ATA
    const pyusdAta = await getAssociatedTokenAddress(PYUSD_MINT, walletKeypair.publicKey);
    console.log("📋 PYUSD ATA:", pyusdAta.toString());
    
    // 检查 PYUSD 账户是否存在
    const pyusdAccountInfo = await connection.getAccountInfo(pyusdAta);
    
    if (!pyusdAccountInfo) {
        console.log("❌ PYUSD 账户未初始化");
        console.log("💡 需要先初始化 PYUSD 账户并获取一些 PYUSD");
        console.log("");
        console.log("选项1: 在交易所购买 PYUSD 并转账到钱包");
        console.log("选项2: 使用 Jupiter 等 DEX 将 USDC 兑换成 PYUSD");
        console.log("");
        
        // 创建初始化 PYUSD 账户的指令
        console.log("🔧 创建初始化 PYUSD ATA 的交易...");
        const tx = new Transaction().add(
            createAssociatedTokenAccountInstruction(
                walletKeypair.publicKey, // payer
                pyusdAta, // ata
                walletKeypair.publicKey, // owner
                PYUSD_MINT // mint
            )
        );
        
        console.log("💡 可以运行以下命令初始化账户:");
        console.log(`   spl-token create-account ${PYUSD_MINT.toString()}`);
        
        return;
    }
    
    // 检查 PYUSD 余额
    const pyusdBalance = await connection.getTokenAccountBalance(pyusdAta);
    console.log("💰 PYUSD 余额:", pyusdBalance.value.uiAmountString || "0");
    
    const depositAmount = new anchor.BN(5_000_000); // 5 PYUSD (6 decimals)
    const requiredAmount = 5;
    
    if (parseFloat(pyusdBalance.value.uiAmountString || "0") < requiredAmount) {
        console.log(`❌ PYUSD 余额不足，需要至少 ${requiredAmount} PYUSD`);
        return;
    }
    
    console.log("\n✅ PYUSD 余额充足，准备测试存款");
    console.log("💰 存款金额:", depositAmount.toString(), "micro-units (5 PYUSD)");
    
    // 尝试获取 vault 信息
    console.log("\n🔍 检查 PYUSD Vault...");
    const vaultInfo = await connection.getAccountInfo(PYUSD_VAULT);
    
    if (!vaultInfo) {
        console.log("❌ 指定的 vault 不存在");
        console.log("💡 需要找到正确的 Kamino PYUSD vault 地址");
        return;
    }
    
    console.log("✅ Vault 存在，Owner:", vaultInfo.owner.toString());
    
    if (!vaultInfo.owner.equals(KAMINO_V2_PROGRAM)) {
        console.log("❌ 这不是 Kamino V2 vault");
        return;
    }
    
    // 解析 vault state
    const data = vaultInfo.data;
    let offset = 8;
    const tokenVault = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    const sharesMint = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    const tokenMint = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    const baseVaultAuthority = new PublicKey(data.slice(offset, offset + 32));
    
    console.log("📋 Vault 信息:");
    console.log("  Token Mint:", tokenMint.toString());
    console.log("  Token Vault:", tokenVault.toString());
    console.log("  Shares Mint:", sharesMint.toString());
    console.log("  Base Authority:", baseVaultAuthority.toString());
    
    if (!tokenMint.equals(PYUSD_MINT)) {
        console.log("\n❌ 这个 vault 不是 PYUSD vault!");
        console.log("   期望:", PYUSD_MINT.toString());
        console.log("   实际:", tokenMint.toString());
        return;
    }
    
    console.log("\n✅ 确认是 PYUSD vault");
    
    // 计算 eventAuthority PDA
    const [eventAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("__event_authority")],
        KAMINO_V2_PROGRAM
    );
    
    // 获取用户的 shares ATA
    const userSharesAta = await getAssociatedTokenAddress(sharesMint, walletKeypair.publicKey);
    
    console.log("\n📋 用户账户:");
    console.log("  PYUSD ATA:", pyusdAta.toString());
    console.log("  Shares ATA:", userSharesAta.toString());
    
    // 设置 Anchor
    const provider = new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(walletKeypair),
        { commitment: "confirmed" }
    );
    anchor.setProvider(provider);
    
    const idl = JSON.parse(fs.readFileSync('./target/idl/mars.json', 'utf8'));
    const program = new Program(idl, provider) as Program<Mars>;
    
    console.log("\n🚀 调用 kamino_deposit...");
    
    try {
        const tx = await (program.methods as any)
            .kaminoDeposit(depositAmount)
            .accounts({
                user: walletKeypair.publicKey,
                vaultState: PYUSD_VAULT,
                tokenVault: tokenVault,
                tokenMint: tokenMint,
                baseVaultAuthority: baseVaultAuthority,
                sharesMint: sharesMint,
                userTokenAta: pyusdAta,
                userSharesAta: userSharesAta,
                klendProgram: KLEND_PROGRAM,
                tokenProgram: TOKEN_PROGRAM_ID,
                sharesTokenProgram: TOKEN_PROGRAM_ID,
                eventAuthority: eventAuthority,
                kaminoVaultProgram: KAMINO_V2_PROGRAM,
            })
            .rpc();
        
        console.log("\n✅ 交易成功!");
        console.log("📋 签名:", tx);
        console.log("🔗 浏览器:", `https://solscan.io/tx/${tx}`);
        
        await connection.confirmTransaction(tx, "confirmed");
        console.log("✅ 交易已确认!");
        
    } catch (error: any) {
        console.error("\n❌ 交易失败:", error.message);
        
        if (error.logs) {
            console.log("\n📜 交易日志:");
            error.logs.forEach((log: string) => console.log("  ", log));
        }
    }
}

testPyusdDeposit()
    .then(() => {
        console.log("\n🎉 测试完成!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ 测试失败:", error.message);
        process.exit(1);
    });
