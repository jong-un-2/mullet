#!/bin/bash

# Mars Vault 主网存款脚本
set -e

echo "💰 Mars Vault 主网存款开始..."

# 检查钱包文件
WALLET_PATH="./phantom-wallet.json"
if [ ! -f "$WALLET_PATH" ]; then
    echo "❌ 钱包文件不存在: $WALLET_PATH"
    exit 1
fi

# 设置主网环境
echo "🌐 设置 Solana 主网环境..."
solana config set --url https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3
solana config set --keypair "$WALLET_PATH"

# 获取钱包地址
WALLET_ADDRESS=$(solana-keygen pubkey "$WALLET_PATH")
echo "📋 钱包地址: $WALLET_ADDRESS"

# USDC 主网地址
USDC_MINT="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
echo "🪙 USDC Mint: $USDC_MINT"

# 检查 USDC 余额
echo "💰 检查 USDC 余额..."
USDC_BALANCE=$(spl-token balance "$USDC_MINT" --owner "$WALLET_ADDRESS" 2>/dev/null || echo "0")
echo "当前 USDC 余额: $USDC_BALANCE"

# 检查是否有足够的 USDC
MIN_USDC="1"
if (( $(echo "$USDC_BALANCE < $MIN_USDC" | bc -l) )); then
    echo "❌ USDC 余额不足，需要至少 $MIN_USDC USDC"
    echo "当前余额: $USDC_BALANCE USDC"
    echo ""
    echo "请先获取一些 USDC:"
    echo "1. 使用 DEX (如 Jupiter) 交换 SOL 为 USDC"
    echo "2. 从交易所转入 USDC"
    exit 1
fi

echo "✅ USDC 余额充足"

# 获取或创建 USDC ATA
echo "🔑 检查 USDC 关联代币账户..."
USDC_ATA=$(spl-token create-account "$USDC_MINT" --owner "$WALLET_ADDRESS" 2>/dev/null || spl-token address --token "$USDC_MINT" --owner "$WALLET_ADDRESS")
echo "📋 USDC ATA: $USDC_ATA"

# 创建存款测试脚本
echo "📝 创建存款测试..."
cat > mainnet-deposit-test.ts << 'EOF'
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Mars } from "../target/types/mars";
import { 
    TOKEN_PROGRAM_ID, 
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction
} from "@solana/spl-token";
import { 
    Connection, 
    Keypair, 
    PublicKey, 
    SystemProgram,
    SYSVAR_RENT_PUBKEY 
} from "@solana/web3.js";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const KAMINO_PROGRAM_ID = new PublicKey("Cyjb5r4P1j1YPEyUemWxMZKbTpBiyNQML1S1YpPvi9xE");

async function depositToMarsVault() {
    // 连接主网
    const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3", "confirmed");
    
    // 加载钱包
    const walletKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(require('fs').readFileSync('./phantom-wallet.json', 'utf8')))
    );
    
    console.log("🔗 连接主网...");
    console.log("📋 钱包地址:", walletKeypair.publicKey.toString());
    
    // 检查 SOL 余额
    const balance = await connection.getBalance(walletKeypair.publicKey);
    console.log("💰 SOL 余额:", balance / 1e9, "SOL");
    
    if (balance < 0.01 * 1e9) {
        throw new Error("SOL 余额不足，需要至少 0.01 SOL");
    }
    
    // 设置 Anchor 提供者
    const provider = new anchor.AnchorProvider(
        connection, 
        new anchor.Wallet(walletKeypair), 
        { commitment: "confirmed" }
    );
    anchor.setProvider(provider);
    
    // 加载程序
    const program = anchor.workspace.Mars as Program<Mars>;
    const programId = program.programId;
    console.log("📋 Mars 程序 ID:", programId.toString());
    
    // 获取用户 USDC ATA
    const userUsdcAta = await getAssociatedTokenAddress(
        USDC_MINT,
        walletKeypair.publicKey
    );
    
    console.log("🪙 用户 USDC ATA:", userUsdcAta.toString());
    
    // 检查 USDC 余额
    try {
        const usdcAccountInfo = await connection.getTokenAccountBalance(userUsdcAta);
        const usdcBalance = parseFloat(usdcAccountInfo.value.amount) / 1e6;
        console.log("💰 USDC 余额:", usdcBalance, "USDC");
        
        if (usdcBalance < 1) {
            throw new Error("USDC 余额不足，需要至少 1 USDC");
        }
    } catch (error) {
        throw new Error("无法获取 USDC 余额，请确保账户已初始化并有足够余额");
    }
    
    // 存款金额 (1 USDC = 1,000,000 微单位)
    const depositAmount = new anchor.BN(1_000_000); // 1 USDC
    
    console.log("💰 准备存款:", depositAmount.toNumber() / 1e6, "USDC");
    
    // 生成金库账户
    const vaultKeypair = Keypair.generate();
    const vaultPubkey = vaultKeypair.publicKey;
    
    console.log("🏦 金库账户:", vaultPubkey.toString());
    
    try {
        // 初始化金库 (如果需要)
        console.log("🚀 初始化金库...");
        const initTx = await program.methods
            .initialize()
            .accounts({
                vault: vaultPubkey,
                user: walletKeypair.publicKey,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .signers([vaultKeypair])
            .rpc();
        
        console.log("✅ 金库初始化成功, 交易签名:", initTx);
        
        // 等待确认
        await provider.connection.confirmTransaction(initTx);
        
    } catch (error) {
        console.log("ℹ️  金库可能已存在或初始化失败:", error.message);
    }
    
    try {
        // 执行存款
        console.log("💰 执行存款...");
        const depositTx = await program.methods
            .vaultDeposit(depositAmount)
            .accounts({
                user: walletKeypair.publicKey,
                userTokenAccount: userUsdcAta,
                vault: vaultPubkey,
                tokenMint: USDC_MINT,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .rpc();
        
        console.log("✅ 存款成功!");
        console.log("📋 交易签名:", depositTx);
        console.log("🔗 Solana Explorer:", `https://solscan.io/tx/${depositTx}`);
        
        // 等待确认
        await provider.connection.confirmTransaction(depositTx);
        
        console.log("🎉 存款已确认!");
        
        return {
            vault: vaultPubkey.toString(),
            transaction: depositTx,
            amount: depositAmount.toNumber() / 1e6
        };
        
    } catch (error) {
        console.error("❌ 存款失败:", error);
        throw error;
    }
}

// 运行存款
depositToMarsVault()
    .then((result) => {
        console.log("\n=== 存款结果 ===");
        console.log("金库地址:", result.vault);
        console.log("交易签名:", result.transaction);
        console.log("存款金额:", result.amount, "USDC");
        console.log("🎉 Mars Vault 主网存款完成!");
    })
    .catch((error) => {
        console.error("\n❌ 存款过程出错:", error.message);
        process.exit(1);
    });
EOF

echo "✅ 存款测试脚本已创建"

# 运行存款测试
echo "🚀 执行存款..."
npx ts-node mainnet-deposit-test.ts

echo "🎉 主网存款流程完成!"