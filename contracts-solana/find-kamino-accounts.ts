import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3", "confirmed");

const VAULT = new PublicKey("A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK");
const KAMINO_PROGRAM = new PublicKey("KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd");
const KLEND_PROGRAM = new PublicKey("KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD");

async function main() {
  console.log("🔍 查找 Kamino 相关账户...\n");
  
  // 尝试不同的 PDA 派生
  const pdas = [
    { name: "reserve", seeds: [Buffer.from("reserve"), VAULT.toBuffer()], program: KAMINO_PROGRAM },
    { name: "liquidity", seeds: [Buffer.from("liquidity"), VAULT.toBuffer()], program: KAMINO_PROGRAM },
    { name: "vault_authority", seeds: [Buffer.from("vault_authority"), VAULT.toBuffer()], program: KAMINO_PROGRAM },
    { name: "token_vault", seeds: [Buffer.from("token_vault"), VAULT.toBuffer()], program: KAMINO_PROGRAM },
  ];
  
  for (const pda of pdas) {
    try {
      const [address] = PublicKey.findProgramAddressSync(pda.seeds, pda.program);
      console.log(`\n📋 ${pda.name}: ${address.toBase58()}`);
      
      const account = await connection.getAccountInfo(address);
      if (account) {
        console.log(`   ✅ 账户存在`);
        console.log(`   Owner: ${account.owner.toBase58()}`);
        console.log(`   Data Length: ${account.data.length}`);
      } else {
        console.log(`   ❌ 账户不存在`);
      }
    } catch (e: any) {
      console.log(`   ❌ 派生失败: ${e.message}`);
    }
  }
  
  // 读取 vault 数据，查找引用的账户
  console.log("\n\n🔍 从 Vault 数据中提取账户引用...\n");
  const vaultAccount = await connection.getAccountInfo(VAULT);
  if (vaultAccount) {
    const data = vaultAccount.data;
    
    // 尝试按照 Anchor 的标准布局解析
    // 通常 pubkeys 从偏移 8 开始 (跳过 discriminator)
    const accountOffsets = [8, 40, 72, 104, 136, 168, 200];  // 每个 32 字节
    
    for (const offset of accountOffsets) {
      if (offset + 32 <= data.length) {
        try {
          const pubkey = new PublicKey(data.slice(offset, offset + 32));
          const account = await connection.getAccountInfo(pubkey);
          if (account) {
            console.log(`\n✅ 偏移 ${offset}: ${pubkey.toBase58()}`);
            console.log(`   Owner: ${account.owner.toBase58()}`);
            console.log(`   Lamports: ${account.lamports}`);
            console.log(`   Data Length: ${account.data.length}`);
            
            // 检查是否是 Token-2022 账户
            if (account.owner.toBase58() === "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb") {
              console.log(`   🎯 这是 Token-2022 账户!`);
            }
          }
        } catch (e) {
          // Skip invalid pubkeys
        }
      }
    }
  }
}

main().catch(console.error);
