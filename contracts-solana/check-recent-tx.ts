import { Connection, PublicKey } from "@solana/web3.js";
import { HELIUS_RPC } from "./constants";

async function main() {
    const connection = new Connection(HELIUS_RPC, "confirmed");
    const walletPubkey = new PublicKey("4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w");
    
    console.log("🔍 检查最近的交易...");
    
    const signatures = await connection.getSignaturesForAddress(walletPubkey, { limit: 5 });
    
    console.log(`\n找到 ${signatures.length} 个最近的交易:\n`);
    
    for (const sig of signatures) {
        console.log(`签名: ${sig.signature}`);
        console.log(`时间: ${new Date((sig.blockTime || 0) * 1000).toLocaleString()}`);
        console.log(`状态: ${sig.err ? '失败' : '成功'}`);
        console.log("");
    }
    
    // 查看最新交易的详情
    if (signatures.length > 0) {
        console.log("\n📋 最新交易详情:");
        const tx = await connection.getParsedTransaction(signatures[0].signature, {
            maxSupportedTransactionVersion: 0
        });
        
        if (tx?.meta?.postTokenBalances) {
            console.log("\n交易后的 Token 余额:");
            for (const balance of tx.meta.postTokenBalances) {
                console.log(`  账户索引 ${balance.accountIndex}:`);
                console.log(`    Mint: ${balance.mint}`);
                console.log(`    Owner: ${balance.owner}`);
                console.log(`    余额: ${balance.uiTokenAmount.uiAmountString}`);
            }
        }
    }
}

main().catch(console.error);
