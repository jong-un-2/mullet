import { Connection, PublicKey } from "@solana/web3.js";
import { HELIUS_RPC } from "./constants";

async function main() {
    const connection = new Connection(HELIUS_RPC, "confirmed");
    const walletPubkey = new PublicKey("4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w");
    
    console.log("🔍 检查所有 token 账户（包括 Kamino shares）...");
    console.log("钱包:", walletPubkey.toString());
    console.log("");
    
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPubkey, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    });
    
    if (tokenAccounts.value.length === 0) {
        console.log("❌ 没有找到任何 token 账户");
        return;
    }
    
    console.log(`找到 ${tokenAccounts.value.length} 个 token 账户:\n`);
    
    for (const acc of tokenAccounts.value) {
        const data = acc.account.data.parsed.info;
        const balance = parseFloat(data.tokenAmount.uiAmountString || "0");
        
        if (balance > 0) {
            console.log(`✅ Token 账户: ${acc.pubkey.toString()}`);
            console.log(`   Mint: ${data.mint}`);
            console.log(`   余额: ${data.tokenAmount.uiAmountString}`);
            console.log(`   小数位: ${data.tokenAmount.decimals}`);
            
            // 检查mint信息
            try {
                const mintInfo = await connection.getParsedAccountInfo(new PublicKey(data.mint));
                if (mintInfo.value?.data && 'parsed' in mintInfo.value.data) {
                    console.log(`   Supply: ${mintInfo.value.data.parsed.info.supply}`);
                }
            } catch (e) {
                // ignore
            }
            console.log("");
        }
    }
}

main().catch(console.error);
