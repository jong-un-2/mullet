import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import * as fs from "fs";
import { HELIUS_RPC, USDC_MINT, PYUSD_MINT, WSOL_MINT } from "./constants";

async function main() {
    const connection = new Connection(HELIUS_RPC, "confirmed");
    
    // 加载钱包
    const walletKeypair = JSON.parse(fs.readFileSync('./user.json', 'utf8'));
    const wallet = PublicKey.default.constructor.prototype.constructor(walletKeypair.slice(0, 32));
    const walletPubkey = new PublicKey("4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w");
    
    console.log("🔍 检查钱包:", walletPubkey.toString());
    console.log("");
    
    const tokens = [
        { name: "USDC", mint: USDC_MINT },
        { name: "PYUSD", mint: PYUSD_MINT },
        { name: "WSOL", mint: WSOL_MINT },
    ];
    
    for (const token of tokens) {
        try {
            const ata = await getAssociatedTokenAddress(token.mint, walletPubkey);
            console.log(`📋 ${token.name}:`);
            console.log(`   Mint: ${token.mint.toString()}`);
            console.log(`   ATA: ${ata.toString()}`);
            
            try {
                const balance = await connection.getTokenAccountBalance(ata);
                console.log(`   ✅ 余额: ${balance.value.uiAmountString || "0"} ${token.name}`);
            } catch (e) {
                console.log(`   ❌ 账户未初始化`);
            }
            console.log("");
        } catch (e) {
            console.log(`   ❌ 错误: ${e.message}`);
            console.log("");
        }
    }
    
    // 检查所有 token 账户
    console.log("📋 查询所有 token 账户...");
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPubkey, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    });
    
    console.log(`找到 ${tokenAccounts.value.length} 个 token 账户:\n`);
    
    for (const acc of tokenAccounts.value) {
        const data = acc.account.data.parsed.info;
        console.log(`Token: ${data.mint}`);
        console.log(`  余额: ${data.tokenAmount.uiAmountString}`);
        console.log(`  账户: ${acc.pubkey.toString()}`);
        console.log("");
    }
}

main().catch(console.error);
