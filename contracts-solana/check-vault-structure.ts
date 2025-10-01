import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3", "confirmed");

const KAMINO_PROGRAM = new PublicKey("KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd");
const VAULT = new PublicKey("A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK");

async function main() {
  console.log("🔍 获取 Vault 账户信息...\n");
  
  const vaultAccount = await connection.getAccountInfo(VAULT);
  if (!vaultAccount) {
    console.log("❌ Vault 账户不存在");
    return;
  }
  
  console.log("📋 Vault Owner:", vaultAccount.owner.toBase58());
  console.log("📋 Vault Data Length:", vaultAccount.data.length);
  console.log("📋 Vault Executable:", vaultAccount.executable);
  
  // 解析 vault 数据 (简化版)
  const data = vaultAccount.data;
  
  // 从 Kamino 的数据布局看，token_vault 应该在某个固定偏移位置
  // 让我们尝试读取前几个账户字段
  console.log("\n📋 Vault 数据前512字节 (hex):");
  console.log(data.slice(0, 512).toString('hex'));
  
  // 尝试找到 token_vault 公钥 (32字节)
  console.log("\n🔍 在 Vault 数据中搜索可能的 PublicKey...");
  for (let i = 0; i < Math.min(200, data.length - 32); i++) {
    const slice = data.slice(i, i + 32);
    try {
      const pubkey = new PublicKey(slice);
      const accountInfo = await connection.getAccountInfo(pubkey);
      if (accountInfo) {
        console.log(`\n✅ 偏移 ${i}: ${pubkey.toBase58()}`);
        console.log(`   Owner: ${accountInfo.owner.toBase58()}`);
        console.log(`   Data Length: ${accountInfo.data.length}`);
      }
    } catch (e) {
      // Invalid pubkey, skip
    }
  }
}

main().catch(console.error);
