import { Connection, PublicKey } from "@solana/web3.js";
import { HELIUS_RPC, USDC_VAULT_ADDRESS } from "./constants";

async function main() {
    const connection = new Connection(HELIUS_RPC, "confirmed");
    
    console.log("🔍 检查 USDC Vault:", USDC_VAULT_ADDRESS.toString());
    
    const vaultInfo = await connection.getAccountInfo(USDC_VAULT_ADDRESS);
    
    if (!vaultInfo) {
        console.log("❌ Vault不存在");
        return;
    }
    
    console.log("✅ Vault存在");
    console.log("Owner:", vaultInfo.owner.toString());
    
    const data = vaultInfo.data;
    let offset = 8;
    const tokenVault = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    const sharesMint = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    const tokenMint = new PublicKey(data.slice(offset, offset + 32));
    
    console.log("tokenVault:", tokenVault.toString());
    console.log("sharesMint:", sharesMint.toString());
    console.log("tokenMint:", tokenMint.toString());
}

main().catch(console.error);
