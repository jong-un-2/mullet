import { Connection, PublicKey } from '@solana/web3.js';
import { HELIUS_RPC } from './constants';

const connection = new Connection(HELIUS_RPC, 'confirmed');

async function debugVault() {
  console.log('🔍 调试 Vault 状态...\n');
  
  const vault = new PublicKey('A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK');
  const sharesAta = new PublicKey('6rJuqfyCBEms6BTBtN6W1M3NB44k6YhmAY8TAqnpYtKq');
  
  // 查看交易详情
  console.log('📜 查看最近的存款交易...\n');
  const sig = '48bQfA361DsT9FjNpetAV6HR4x6Cw8nPKwMdJrXVL6FCSJGjjXxkXZBpM4RZ2FitvTcqVraGfdET4sJr15PNGzjS';
  
  const tx = await connection.getParsedTransaction(sig, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed'
  });
  
  if (tx && tx.meta) {
    console.log('✅ 交易找到\n');
    
    console.log('📊 Token 余额变化:');
    console.log('Pre balances:', tx.meta.preTokenBalances?.length || 0);
    console.log('Post balances:', tx.meta.postTokenBalances?.length || 0);
    
    if (tx.meta.preTokenBalances && tx.meta.postTokenBalances) {
      console.log('\n变化详情:');
      
      tx.meta.postTokenBalances.forEach((post, i) => {
        const pre = tx.meta!.preTokenBalances!.find(p => p.accountIndex === post.accountIndex);
        
        if (pre) {
          const preAmount = Number(pre.uiTokenAmount.uiAmount || 0);
          const postAmount = Number(post.uiTokenAmount.uiAmount || 0);
          const change = postAmount - preAmount;
          
          console.log(`\n账户 ${post.accountIndex}:`);
          console.log(`  Owner: ${post.owner}`);
          console.log(`  Mint: ${post.mint}`);
          console.log(`  前: ${preAmount}`);
          console.log(`  后: ${postAmount}`);
          console.log(`  变化: ${change >= 0 ? '+' : ''}${change}`);
        } else {
          console.log(`\n账户 ${post.accountIndex} (新建):`);
          console.log(`  Owner: ${post.owner}`);
          console.log(`  Mint: ${post.mint}`);
          console.log(`  余额: ${post.uiTokenAmount.uiAmount}`);
        }
      });
    }
    
    console.log('\n📝 日志消息:');
    if (tx.meta.logMessages) {
      tx.meta.logMessages.forEach(log => {
        if (log.includes('Transfer') || log.includes('amount') || log.includes('shares')) {
          console.log('  ', log);
        }
      });
    }
  } else {
    console.log('❌ 交易未找到');
  }
  
  // 直接查看 shares 余额
  console.log('\n\n💰 当前 Shares 余额:');
  const sharesBalance = await connection.getTokenAccountBalance(sharesAta);
  console.log(`  Shares: ${sharesBalance.value.uiAmount}`);
  console.log(`  Raw: ${sharesBalance.value.amount}`);
  
  // 在 Kamino 网站查看
  console.log('\n🌐 在 Kamino 网站查看详情:');
  console.log(`  https://kamino.finance/earn/${vault.toBase58()}`);
  console.log('\n💡 在网站上可以看到:');
  console.log('  - 你的存款金额');
  console.log('  - APY 收益率');
  console.log('  - Vault 总 TVL');
  console.log('  - 取款选项');
}

debugVault().catch(console.error);
