import { Connection, PublicKey } from "@solana/web3.js";
import { HELIUS_RPC, USDC_MINT } from "./constants";

async function checkVault(connection: Connection, vaultAddr: string) {
    try {
        const vault = new PublicKey(vaultAddr);
        const vaultInfo = await connection.getAccountInfo(vault);
        
        if (!vaultInfo) {
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
            owner: vaultInfo.owner.toString(),
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
    
    console.log("🔍 搜索使用真正 USDC 的 Kamino vault...");
    console.log("USDC Mint:", USDC_MINT.toString());
    console.log("");
    
    // 从 Kamino 官网已知的一些 vault 地址
    const knownVaults = [
        "7gZNLDbWE73ueAoHuAeFoSu7JqmorwCLpNTBXHtYSFTa",
        "CfWW3fuSiTJYhdvNA8xsrzky19xTHH6wWgVUvU4RZYz4", 
        "FrhGKw5RDdJFLcFK8XiHm6jpBPdWzd2vxKCsD8i7RQQS",
        "83XaC2jg2FqHMVjcUnHZomvh34k3u1hBH6VQU42S2jkV",
    ];
    
    for (const vaultAddr of knownVaults) {
        const info = await checkVault(connection, vaultAddr);
        
        if (info) {
            console.log(`Vault: ${info.vault}`);
            console.log(`  Owner: ${info.owner}`);
            console.log(`  Token Mint: ${info.tokenMint}`);
            
            if (info.tokenMint === USDC_MINT.toString()) {
                console.log("  ✨ 找到 USDC vault!");
                console.log(`  Token Vault: ${info.tokenVault}`);
                console.log(`  Shares Mint: ${info.sharesMint}`);
                console.log(`  Base Authority: ${info.baseVaultAuthority}`);
            }
            console.log("");
        }
    }
}

main().catch(console.error);
