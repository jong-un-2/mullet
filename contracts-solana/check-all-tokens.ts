import { Connection, PublicKey } from "@solana/web3.js";
import { HELIUS_RPC } from "./constants";

async function main() {
    const connection = new Connection(HELIUS_RPC, "confirmed");
    const walletPubkey = new PublicKey("4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w");
    
    console.log("🔍 详细检查钱包:", walletPubkey.toString());
    console.log("");
    
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPubkey, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    });
    
    console.log(`找到 ${tokenAccounts.value.length} 个 token 账户:\n`);
    
    for (const acc of tokenAccounts.value) {
        const data = acc.account.data.parsed.info;
        const balance = data.tokenAmount.uiAmountString;
        const decimals = data.tokenAmount.decimals;
        
        console.log(`Token Mint: ${data.mint}`);
        console.log(`  账户地址: ${acc.pubkey.toString()}`);
        console.log(`  余额: ${balance}`);
        console.log(`  小数位: ${decimals}`);
        console.log(`  原始金额: ${data.tokenAmount.amount}`);
        
        // 检查是否是 PYUSD
        if (data.mint === "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo") {
            console.log(`  ✨ 这是 PYUSD!`);
        }
        // 检查是否是 USDC
        if (data.mint === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") {
            console.log(`  ✨ 这是 USDC!`);
        }
        console.log("");
    }
}

main().catch(console.error);
