import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { HELIUS_RPC, PYUSD_MINT } from "./constants";

async function main() {
    const connection = new Connection(HELIUS_RPC, "confirmed");
    const walletPubkey = new PublicKey("4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w");
    
    console.log("🔍 检查 PYUSD 余额");
    console.log("PYUSD Mint:", PYUSD_MINT.toString());
    
    const pyusdAta = await getAssociatedTokenAddress(PYUSD_MINT, walletPubkey);
    console.log("PYUSD ATA:", pyusdAta.toString());
    
    try {
        const balance = await connection.getTokenAccountBalance(pyusdAta);
        console.log("\n✅ PYUSD 余额:", balance.value.uiAmountString || "0");
        console.log("   原始金额:", balance.value.amount);
        console.log("   小数位数:", balance.value.decimals);
    } catch (e) {
        console.log("\n❌ PYUSD 账户未初始化");
    }
}

main().catch(console.error);
