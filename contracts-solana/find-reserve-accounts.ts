import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount } from '@solana/spl-token';

const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3", "confirmed");

const VAULT = new PublicKey("A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK");
const TOKEN_VAULT_FROM_LOGS = new PublicKey("7fLxEftpppneavpueYgP2s7HhSGbWpj2jTCmAEwwqonY");
const KAMINO_PROGRAM = new PublicKey("KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd");
const PYUSD_MINT = new PublicKey("2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo");

async function main() {
  console.log("🔍 查找 Kamino Vault 的 Reserve 账户...\n");
  
  // 尝试派生 reserve PDA
  const [reservePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("reserve"), VAULT.toBuffer()],
    KAMINO_PROGRAM
  );
  
  console.log("📋 Reserve PDA:", reservePda.toBase58());
  
  const reserveAccount = await connection.getAccountInfo(reservePda);
  if (reserveAccount) {
    console.log("✅ Reserve 账户存在");
    console.log("   Owner:", reserveAccount.owner.toBase58());
    console.log("   Data Length:", reserveAccount.data.length);
    
    // 尝试读取前几个字段
    console.log("\n📋 Reserve 数据前256字节 (hex):");
    console.log(reserveAccount.data.slice(0, 256).toString('hex'));
    
    // 搜索 PublicKey
    console.log("\n🔍 在 Reserve 数据中搜索账户...");
    for (let i = 0; i < Math.min(200, reserveAccount.data.length - 32); i++) {
      const slice = reserveAccount.data.slice(i, i + 32);
      try {
        const pubkey = new PublicKey(slice);
        const accountInfo = await connection.getAccountInfo(pubkey);
        if (accountInfo && accountInfo.owner.toBase58() === "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb") {
          console.log(`\n✅ 偏移 ${i}: ${pubkey.toBase58()}`);
          console.log(`   Owner: ${accountInfo.owner.toBase58()} (Token-2022)`);
          console.log(`   Data Length: ${accountInfo.data.length}`);
          
          // 尝试解析为 token account
          try {
            const tokenAccount = await getAccount(connection, pubkey, "confirmed", require('@solana/spl-token').TOKEN_2022_PROGRAM_ID);
            console.log(`   Mint: ${tokenAccount.mint.toBase58()}`);
            console.log(`   Amount: ${tokenAccount.amount.toString()}`);
          } catch (e) {
            // Not a token account
          }
        }
      } catch (e) {
        // Invalid pubkey, skip
      }
    }
  } else {
    console.log("❌ Reserve 账户不存在");
  }
}

main().catch(console.error);
