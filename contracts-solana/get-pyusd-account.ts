import { Connection, PublicKey } from "@solana/web3.js";
import { HELIUS_RPC, PYUSD_MINT } from "./constants";

async function main() {
    const connection = new Connection(HELIUS_RPC, "confirmed");
    const walletPubkey = new PublicKey("4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w");
    
    console.log("🔍 查找钱包的 PYUSD 账户...");
    console.log("钱包:", walletPubkey.toString());
    console.log("PYUSD Mint:", PYUSD_MINT.toString());
    console.log("");
    
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPubkey, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    });
    
    console.log(`找到 ${tokenAccounts.value.length} 个 token 账户\n`);
    
    for (const acc of tokenAccounts.value) {
        const data = acc.account.data.parsed.info;
        console.log(`Mint: ${data.mint}`);
        console.log(`账户: ${acc.pubkey.toString()}`);
        console.log(`余额: ${data.tokenAmount.uiAmountString}`);
        
        if (data.mint === PYUSD_MINT.toString()) {
            console.log("✨✨✨ 这是 PYUSD 账户! ✨✨✨");
        }
        console.log("");
    }
}

main().catch(console.error);
