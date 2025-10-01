import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3", "confirmed");
const VAULT = new PublicKey("A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK");

async function main() {
  const vaultInfo = await connection.getAccountInfo(VAULT);
  if (!vaultInfo) return;
  
  const data = vaultInfo.data;
  console.log("📋 Vault 数据解析 (前 200 字节):\n");
  
  // Discriminator (8 bytes)
  console.log("Offset 0-7 (discriminator):", data.slice(0, 8).toString('hex'));
  
  // 从偏移 8 开始，每 32 字节读取一个 PublicKey
  for (let i = 8; i < 200; i += 32) {
    try {
      const pubkey = new PublicKey(data.slice(i, i + 32));
      console.log(`\nOffset ${i}-${i+31}: ${pubkey.toBase58()}`);
      
      const account = await connection.getAccountInfo(pubkey);
      if (account) {
        console.log(`  ✅ 存在: Owner=${account.owner.toBase58().slice(0, 20)}... DataLen=${account.data.length}`);
      } else {
        console.log(`  ❌ 不存在`);
      }
    } catch (e) {
      console.log(`\nOffset ${i}-${i+31}: [无效的 PublicKey]`);
    }
  }
}

main().catch(console.error);
