import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3", "confirmed");
const VAULT = new PublicKey("A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK");
const KAMINO_PROGRAM = new PublicKey("KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd");

async function main() {
  console.log("🔍 获取 Vault 最近的交易...\n");
  
  const signatures = await connection.getSignaturesForAddress(VAULT, { limit: 5 });
  
  console.log(`找到 ${signatures.length} 个交易\n`);
  
  for (const sig of signatures.slice(0, 2)) {  // 只看前2个
    console.log(`📝 Signature: ${sig.signature}`);
    console.log(`   https://solscan.io/tx/${sig.signature}\n`);
    
    const tx = await connection.getParsedTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
    if (tx && tx.meta) {
      const accountKeys = tx.transaction.message.accountKeys.map((k: any) => 
        typeof k === 'string' ? k : k.pubkey.toBase58()
      );
      console.log("   账户列表:");
      accountKeys.slice(0, 15).forEach((key: string, i: number) => {
        console.log(`     ${i}: ${key}`);
      });
      console.log();
    }
  }
}

main().catch(console.error);
