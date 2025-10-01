import { Connection, PublicKey } from "@solana/web3.js";
import { HELIUS_RPC, USDC_MINT, KAMINO_V2_PROGRAM } from "./constants";

async function main() {
    const connection = new Connection(HELIUS_RPC, "confirmed");
    
    console.log("🔍 搜索 Kamino V2 的 USDC vaults...");
    console.log("USDC Mint:", USDC_MINT.toString());
    console.log("Kamino V2:", KAMINO_V2_PROGRAM.toString());
    
    // 一些已知的 Kamino vaults
    const knownVaults = [
        "7gZNLDbWE73ueAoHuAeFoSu7JqmorwCLpNTBXHtYSFTa", // Main USDC vault
        "2v2MfZyQvEWWuZkKgMPELFGkLPNEtLwEfKRMUQRRXRFv", // USDC-2
    ];
    
    for (const vaultAddr of knownVaults) {
        try {
            const vault = new PublicKey(vaultAddr);
            const vaultInfo = await connection.getAccountInfo(vault);
            
            if (!vaultInfo) {
                console.log(`\n❌ ${vaultAddr} 不存在`);
                continue;
            }
            
            console.log(`\n✅ Vault: ${vaultAddr}`);
            console.log("   Owner:", vaultInfo.owner.toString());
            
            const data = vaultInfo.data;
            let offset = 8;
            const tokenVault = new PublicKey(data.slice(offset, offset + 32));
            offset += 32;
            const sharesMint = new PublicKey(data.slice(offset, offset + 32));
            offset += 32;
            const tokenMint = new PublicKey(data.slice(offset, offset + 32));
            
            console.log("   tokenMint:", tokenMint.toString());
            
            if (tokenMint.equals(USDC_MINT)) {
                console.log("   ✨ 这是真正的 USDC vault!");
                console.log("   tokenVault:", tokenVault.toString());
                console.log("   sharesMint:", sharesMint.toString());
            }
        } catch (e) {
            console.log(`\n❌ ${vaultAddr} 错误:`, e.message);
        }
    }
}

main().catch(console.error);
