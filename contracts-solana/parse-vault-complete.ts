import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3", "confirmed");
const VAULT = new PublicKey("A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK");
const TOKEN_2022 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

async function main() {
  console.log("🔍 完整解析 Vault 数据结构...\n");
  
  const vaultAccount = await connection.getAccountInfo(VAULT);
  if (!vaultAccount) return;
  
  const data = vaultAccount.data;
  
  console.log("📋 搜索所有有效的 PublicKey (每32字节)...\n");
  
  const validAccounts: Array<{offset: number, pubkey: PublicKey, owner: string, lamports: number, dataLen: number}> = [];
  
  for (let i = 0; i <= data.length - 32; i += 8) {  // 每8字节对齐检查
    try {
      const pubkey = new PublicKey(data.slice(i, i + 32));
      const account = await connection.getAccountInfo(pubkey);
      if (account) {
        validAccounts.push({
          offset: i,
          pubkey,
          owner: account.owner.toBase58(),
          lamports: account.lamports,
          dataLen: account.data.length
        });
      }
    } catch (e) {
      // Invalid pubkey
    }
  }
  
  console.log(`找到 ${validAccounts.length} 个有效账户:\n`);
  
  for (const acc of validAccounts) {
    console.log(`📍 偏移 ${acc.offset}:`);
    console.log(`   地址: ${acc.pubkey.toBase58()}`);
    console.log(`   Owner: ${acc.owner}`);
    console.log(`   Lamports: ${acc.lamports}`);
    console.log(`   Data: ${acc.dataLen} bytes`);
    
    if (acc.owner === TOKEN_2022.toBase58()) {
      console.log(`   🎯 Token-2022 账户!`);
    }
    if (acc.owner === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") {
      console.log(`   💰 SPL Token 账户!`);
    }
    console.log();
  }
}

main().catch(console.error);
