import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Mars } from "./target/types/mars";
import { 
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
} from "@solana/spl-token";
import { 
    Connection, 
    Keypair, 
    PublicKey,
} from "@solana/web3.js";
import * as fs from "fs";
import { HELIUS_RPC, MARS_PROGRAM_ID, KAMINO_V2_PROGRAM, KLEND_PROGRAM, PYUSD_MINT } from "./constants";

// PYUSD Kamino Vault - 需要找到正确的地址
// 先尝试一些已知的 vault 地址
const POSSIBLE_PYUSD_VAULTS = [
    "CfWW3fuSiTJYhdvNA8xsrzky19xTHH6wWgVUvU4RZYz4",
    "83v8iPyZihDEjDdY8RdZddyZNyUtXngz69Lgo9Kt5d6d",
    "H8x3qk4qxUEPRQBa63BQcCEKW94Ea8ceEzBhPRMiDtYa",
];

async function testKaminoDeposit() {
    console.log("🚀 Mars合约 PYUSD Kamino Deposit 测试 (5 PYUSD)\n");
    
    // 连接主网
    const connection = new Connection(HELIUS_RPC, "confirmed");
    
    // 加载钱包
    const walletKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync('./user.json', 'utf8')))
    );
    
    console.log("📋 钱包地址:", walletKeypair.publicKey.toString());
    console.log("📋 Mars程序ID:", MARS_PROGRAM_ID.toString());
    console.log("📋 Kamino V2程序:", KAMINO_V2_PROGRAM.toString());
    console.log("📋 PYUSD Mint:", PYUSD_MINT.toString());
    console.log("");
    
    // 检查余额
    const balance = await connection.getBalance(walletKeypair.publicKey);
    console.log("💰 SOL余额:", (balance / 1e9).toFixed(4), "SOL");
    
    if (balance < 0.01 * 1e9) {
        throw new Error("❌ SOL余额不足，需要至少0.01 SOL");
    }
    
    // 检查 PYUSD 余额
    const pyusdAta = await getAssociatedTokenAddress(PYUSD_MINT, walletKeypair.publicKey);
    console.log("📋 PYUSD ATA:", pyusdAta.toString());
    
    try {
        const pyusdBalance = await connection.getTokenAccountBalance(pyusdAta);
        console.log("💰 PYUSD 余额:", pyusdBalance.value.uiAmountString || "0", "PYUSD");
        
        if (parseFloat(pyusdBalance.value.uiAmountString || "0") < 5) {
            throw new Error("❌ PYUSD 余额不足，需要至少 5 PYUSD");
        }
    } catch (e: any) {
        throw new Error("❌ 无法获取 PYUSD 余额: " + e.message);
    }
    
    // 尝试找到正确的 PYUSD vault
    console.log("\n🔍 搜索 PYUSD Kamino Vault...");
    let VAULT_ADDRESS: PublicKey | null = null;
    let vaultInfo: any = null;
    
    for (const vaultAddr of POSSIBLE_PYUSD_VAULTS) {
        try {
            const vault = new PublicKey(vaultAddr);
            const info = await connection.getAccountInfo(vault);
            
            if (info && info.owner.equals(KAMINO_V2_PROGRAM)) {
                const data = info.data;
                let offset = 8;
                offset += 32; // skip tokenVault
                offset += 32; // skip sharesMint
                const tokenMint = new PublicKey(data.slice(offset, offset + 32));
                
                if (tokenMint.equals(PYUSD_MINT)) {
                    console.log(`✅ 找到 PYUSD Vault: ${vaultAddr}`);
                    VAULT_ADDRESS = vault;
                    vaultInfo = info;
                    break;
                }
            }
        } catch (e) {
            continue;
        }
    }
    
    if (!VAULT_ADDRESS || !vaultInfo) {
        throw new Error("❌ 未找到有效的 PYUSD Kamino Vault，请手动指定");
    }
    
    console.log("📋 测试Vault:", VAULT_ADDRESS.toString());
    
    // 解析 vault state
    const data = vaultInfo.data;
    
    // 解析vault state结构 (跳过8字节discriminator)
    let offset = 8;
    const tokenVault = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    const sharesMint = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    const tokenMint = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    const baseVaultAuthority = new PublicKey(data.slice(offset, offset + 32));
    
    console.log("✅ Vault State解析成功:");
    console.log("  tokenVault:", tokenVault.toString());
    console.log("  tokenMint:", tokenMint.toString());
    console.log("  sharesMint:", sharesMint.toString());
    console.log("  baseVaultAuthority:", baseVaultAuthority.toString());
    
    // 计算eventAuthority PDA
    const [eventAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("__event_authority")],
        KAMINO_V2_PROGRAM
    );
    console.log("  eventAuthority:", eventAuthority.toString());
    
    // 获取用户的token ATAs
    const userTokenAta = await getAssociatedTokenAddress(
        tokenMint,
        walletKeypair.publicKey
    );
    
    const userSharesAta = await getAssociatedTokenAddress(
        sharesMint,
        walletKeypair.publicKey
    );
    
    console.log("\n📋 用户账户:");
    console.log("  userTokenAta:", userTokenAta.toString());
    console.log("  userSharesAta:", userSharesAta.toString());
    
    // 检查token余额
    try {
        const tokenBalance = await connection.getTokenAccountBalance(userTokenAta);
        console.log("  Token余额:", tokenBalance.value.uiAmountString || "0");
        
        if (parseFloat(tokenBalance.value.amount) < 100000) { // 0.1 token (假设6 decimals)
            console.log("⚠️  警告: Token余额可能不足");
        }
    } catch (e) {
        console.log("⚠️  Token账户可能未初始化");
    }
    
    // 设置Anchor
    const provider = new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(walletKeypair),
        { commitment: "confirmed" }
    );
    anchor.setProvider(provider);
    
    // 加载程序
    const idl = JSON.parse(fs.readFileSync('./target/idl/mars.json', 'utf8'));
    const program = new Program(idl, provider) as Program<Mars>;
    
    console.log("\n🔧 准备调用Mars合约...");
    
    // 存款金额: 5 PYUSD = 5,000,000 micro-units (PYUSD has 6 decimals)
    const depositAmount = new anchor.BN(5_000_000);
    console.log("💰 存款金额:", depositAmount.toString(), "micro-units (5 PYUSD)");
    
    try {
        console.log("\n🚀 调用 kamino_deposit...");
        
        const tx = await (program.methods as any)
            .kaminoDeposit(depositAmount)
            .accounts({
                user: walletKeypair.publicKey,
                vaultState: VAULT_ADDRESS,
                tokenVault: tokenVault,
                tokenMint: tokenMint,
                baseVaultAuthority: baseVaultAuthority,
                sharesMint: sharesMint,
                userTokenAta: userTokenAta,
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
        
        // 等待确认
        await connection.confirmTransaction(tx, "confirmed");
        console.log("✅ 交易已确认!");
        
        return { success: true, signature: tx };
        
    } catch (error: any) {
        console.error("\n❌ 交易失败:", error.message);
        
        if (error.logs) {
            console.log("\n📜 交易日志:");
            error.logs.forEach((log: string) => console.log("  ", log));
        }
        
        throw error;
    }
}

// 运行测试
testKaminoDeposit()
    .then((result) => {
        console.log("\n🎉 测试完成!");
        console.log("结果:", result);
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ 测试失败:", error.message);
        process.exit(1);
    });
