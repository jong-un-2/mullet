import { Connection, PublicKey } from "@solana/web3.js";
import { HELIUS_RPC, PYUSD_MINT, KAMINO_V2_PROGRAM } from "./constants";

async function checkVault(connection: Connection, vaultAddr: string) {
    try {
        const vault = new PublicKey(vaultAddr);
        const vaultInfo = await connection.getAccountInfo(vault);
        
        if (!vaultInfo) {
            return null;
        }
        
        if (!vaultInfo.owner.equals(KAMINO_V2_PROGRAM)) {
            return null;
        }
        
        const data = vaultInfo.data;
        let offset = 8;
        const tokenVault = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        const sharesMint = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        const tokenMint = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        const baseVaultAuthority = new PublicKey(data.slice(offset, offset + 32));
        
        return {
            vault: vaultAddr,
            tokenMint: tokenMint.toString(),
            tokenVault: tokenVault.toString(),
            sharesMint: sharesMint.toString(),
            baseVaultAuthority: baseVaultAuthority.toString(),
        };
    } catch (e) {
        return null;
    }
}

async function main() {
    const connection = new Connection(HELIUS_RPC, "confirmed");
    
    console.log("🔍 搜索 Kamino PYUSD vault...");
    console.log("PYUSD Mint:", PYUSD_MINT.toString());
    console.log("Kamino V2:", KAMINO_V2_PROGRAM.toString());
    console.log("");
    
    // 从 Kamino 网站已知的 PYUSD vault
    const knownVaults = [
        "CfWW3fuSiTJYhdvNA8xsrzky19xTHH6wWgVUvU4RZYz4", // PYUSD Main
        "83v8iPyZihDEjDdY8RdZddyZNyUtXngz69Lgo9Kt5d6d", // PYUSD-2
        "H8x3qk4qxUEPRQBa63BQcCEKW94Ea8ceEzBhPRMiDtYa", // PYUSD-3
    ];
    
    for (const vaultAddr of knownVaults) {
        const info = await checkVault(connection, vaultAddr);
        
        if (info) {
            console.log(`✅ Vault: ${info.vault}`);
            console.log(`   Token Mint: ${info.tokenMint}`);
            
            if (info.tokenMint === PYUSD_MINT.toString()) {
                console.log("   ✨ 找到 PYUSD vault!");
                console.log(`   Token Vault: ${info.tokenVault}`);
                console.log(`   Shares Mint: ${info.sharesMint}`);
                console.log(`   Base Authority: ${info.baseVaultAuthority}`);
                console.log("");
                break;
            }
        } else {
            console.log(`❌ ${vaultAddr} 不是有效的 Kamino V2 vault`);
        }
        console.log("");
    }
}

main().catch(console.error);
