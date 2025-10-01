import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3", "confirmed");
const VAULT = new PublicKey("A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK");

async function main() {
  console.log("🔍 分析成功的 Kamino deposit 交易...\n");
  
  const signatures = await connection.getSignaturesForAddress(VAULT, { limit: 10 });
  
  for (const sig of signatures) {
    const tx = await connection.getParsedTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
    if (!tx || !tx.meta) continue;
    
    // 查找包含 "Deposit" 的日志
    const hasDeposit = tx.meta.logMessages?.some(log => log.includes("Instruction: Deposit"));
    if (!hasDeposit) continue;
    
    console.log(`✅ 找到 Deposit 交易: ${sig.signature}`);
    console.log(`   https://solscan.io/tx/${sig.signature}\n`);
    
    const accountKeys = tx.transaction.message.accountKeys.map((k: any) => 
      typeof k === 'string' ? k : k.pubkey.toBase58()
    );
    
    console.log("📋 账户列表:");
    accountKeys.forEach((key: string, i: number) => {
      console.log(`   ${i}: ${key}`);
    });
    
    console.log("\n📜 交易日志:");
    tx.meta.logMessages?.slice(0, 20).forEach(log => {
      if (log.includes("Kamino") || log.includes("Deposit") || log.includes("Program log:")) {
        console.log(`   ${log}`);
      }
    });
    
    break;  // 只分析第一个
  }
}

main().catch(console.error);
