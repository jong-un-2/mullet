import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { HELIUS_RPC, PYUSD_MINT } from "./constants";

async function main() {
    const connection = new Connection(HELIUS_RPC, "confirmed");
    const walletPubkey = new PublicKey("4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w");
    
    console.log("🔍 强制检查 PYUSD...");
    console.log("PYUSD Mint:", PYUSD_MINT.toString());
    
    // 计算 PYUSD ATA
    const pyusdAta = await getAssociatedTokenAddress(PYUSD_MINT, walletPubkey);
    console.log("计算的 PYUSD ATA:", pyusdAta.toString());
    
    // 直接查询这个地址
    try {
        const accountInfo = await connection.getAccountInfo(pyusdAta);
        if (accountInfo) {
            console.log("✅ PYUSD 账户存在!");
            console.log("Owner:", accountInfo.owner.toString());
            console.log("Data length:", accountInfo.data.length);
            
            // 尝试获取余额
            const balance = await connection.getTokenAccountBalance(pyusdAta);
            console.log("💰 PYUSD 余额:", balance.value.uiAmountString);
            console.log("原始金额:", balance.value.amount);
        } else {
            console.log("❌ PYUSD 账户不存在");
        }
    } catch (e: any) {
        console.log("❌ 错误:", e.message);
    }
    
    // 也检查所有账户
    console.log("\n📋 所有 token 账户:");
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPubkey, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    });
    
    console.log(`找到 ${tokenAccounts.value.length} 个账户:`);
    for (const acc of tokenAccounts.value) {
        const data = acc.account.data.parsed.info;
        console.log(`  ${data.mint}: ${data.tokenAmount.uiAmountString}`);
    }
}

main().catch(console.error);
