import { Connection, PublicKey } from "@solana/web3.js";
import { HELIUS_RPC } from "./constants";

async function main() {
    const connection = new Connection(HELIUS_RPC, "confirmed");
    const walletPubkey = new PublicKey("4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w");
    
    console.log("🔍 检查钱包:", walletPubkey.toString());
    
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPubkey, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    });
    
    console.log(`\n找到 ${tokenAccounts.value.length} 个 token 账户:\n`);
    
    if (tokenAccounts.value.length === 0) {
        console.log("❌ 钱包没有任何 token 账户");
        console.log("💡 需要先获取一些 USDC 或其他 token");
        return;
    }
    
    for (const acc of tokenAccounts.value) {
        const data = acc.account.data.parsed.info;
        const balance = data.tokenAmount.uiAmountString;
        
        if (parseFloat(balance) > 0) {
            console.log(`✅ Token Mint: ${data.mint}`);
            console.log(`   余额: ${balance}`);
            console.log(`   账户: ${acc.pubkey.toString()}`);
            console.log("");
        }
    }
}

main().catch(console.error);
