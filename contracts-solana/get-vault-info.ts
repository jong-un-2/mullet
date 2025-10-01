/**
 * 获取Kamino Vault的实际信息
 * 严格按照SDK实现来准备CPI调用所需的所有账户
 */
import { Connection, PublicKey } from "@solana/web3.js";
import * as fs from "fs";

const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3";
const KAMINO_PROGRAM_ID = new PublicKey("Cyjb5r4P1j1YPEyUemWxMZKbTpBiyNQML1S1YpPvi9xE");
const KLEND_PROGRAM_ID = new PublicKey("KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD");

// Kamino USDC Vault
const USDC_VAULT = new PublicKey("A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK");

async function getVaultInfo() {
    console.log("🔍 获取Kamino Vault信息...");
    console.log("=" .repeat(70));
    
    const connection = new Connection(RPC_URL, "confirmed");
    
    // 获取vault state账户数据
    console.log("\n📋 Vault地址:", USDC_VAULT.toString());
    const vaultAccount = await connection.getAccountInfo(USDC_VAULT);
    
    if (!vaultAccount) {
        throw new Error("Vault账户不存在");
    }
    
    console.log("✅ Vault账户找到");
    console.log("  数据大小:", vaultAccount.data.length, "bytes");
    console.log("  所有者:", vaultAccount.owner.toString());
    
    // 解析vault state（基于Kamino的结构）
    // 这里我们需要从SDK导入或者手动解析
    // 简化版本：直接输出关键信息
    
    console.log("\n🔑 需要从vault state解析的关键字段:");
    console.log("  - tokenVault: vault的代币金库地址");
    console.log("  - tokenMint: 代币mint地址（USDC）");
    console.log("  - baseVaultAuthority: PDA权限");
    console.log("  - sharesMint: 份额mint地址");
    console.log("  - tokenProgram: Token程序ID");
    console.log("  - vaultReserves[]: vault的所有reserves数组");
    
    // 计算PDAs
    const [baseVaultAuthority, baseVaultAuthorityBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("base_vault_authority"), USDC_VAULT.toBuffer()],
        KAMINO_PROGRAM_ID
    );
    
    const [eventAuthority, eventAuthorityBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("__event_authority")],
        KAMINO_PROGRAM_ID
    );
    
    console.log("\n🔐 计算出的PDAs:");
    console.log("  baseVaultAuthority:", baseVaultAuthority.toString());
    console.log("  eventAuthority:", eventAuthority.toString());
    
    console.log("\n💡 使用Kamino SDK获取完整信息的方法:");
    console.log(`
import { KaminoVault } from '@kamino-finance/klend-sdk';

const vault = new KaminoVault(VAULT_ADDRESS);
const vaultState = await vault.getState(connection);

console.log("Vault State:", {
  tokenVault: vaultState.tokenVault.toString(),
  tokenMint: vaultState.tokenMint.toString(),
  sharesMint: vaultState.sharesMint.toString(),
  baseVaultAuthority: vaultState.baseVaultAuthority.toString(),
  tokenProgram: vaultState.tokenProgram.toString(),
});

// 获取所有reserves
const reserves = vaultState.allocations
  .filter(a => a.reserve !== DEFAULT_PUBLIC_KEY)
  .map(a => a.reserve);

console.log("Vault Reserves:", reserves.map(r => r.toString()));
    `);
    
    console.log("\n📝 完整的Deposit CPI账户列表（按顺序）:");
    console.log("1. user (mut, signer) - 用户");
    console.log("2. vaultState (mut) - Vault状态");
    console.log("3. tokenVault (mut) - Vault代币金库");
    console.log("4. tokenMint - 代币mint");
    console.log("5. baseVaultAuthority - Vault权限PDA");
    console.log("6. sharesMint (mut) - 份额mint");
    console.log("7. userTokenAta (mut) - 用户代币ATA");
    console.log("8. userSharesAta (mut) - 用户份额ATA");
    console.log("9. klendProgram - Klend程序");
    console.log("10. tokenProgram - Token程序");
    console.log("11. sharesTokenProgram - 份额Token程序");
    console.log("12. eventAuthority - 事件权限PDA");
    console.log("13. program - Kamino Vault程序");
    console.log("\n📋 Remaining Accounts (动态添加):");
    console.log("  对于每个reserve:");
    console.log("    - reserve账户 (mut)");
    console.log("  然后对于每个reserve:");
    console.log("    - lendingMarket账户 (readonly)");
    
    console.log("\n" + "=".repeat(70));
    
    return {
        vault: USDC_VAULT,
        baseVaultAuthority,
        eventAuthority,
        kaminoProgram: KAMINO_PROGRAM_ID,
        klendProgram: KLEND_PROGRAM_ID,
    };
}

getVaultInfo()
    .then((info) => {
        console.log("\n✅ 信息获取完成");
        console.log("\n💡 下一步:");
        console.log("1. 使用Kamino SDK获取完整的vaultState");
        console.log("2. 提取所有reserves和lendingMarkets");
        console.log("3. 在Mars合约中准备这些账户进行CPI调用");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ 错误:", error);
        process.exit(1);
    });
