import { Connection, PublicKey } from '@solana/web3.js';
import { HELIUS_RPC } from './constants';

const connection = new Connection(HELIUS_RPC, 'confirmed');

async function showDepositSummary() {
  console.log('📊 你的 PYUSD Kamino 存款汇总\n');
  console.log('=' .repeat(60));
  
  const wallet = new PublicKey('4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w');
  const vault = new PublicKey('A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK');
  const sharesAta = new PublicKey('6rJuqfyCBEms6BTBtN6W1M3NB44k6YhmAY8TAqnpYtKq');
  const pyusdAccount = new PublicKey('DhxxxG3fouc2j9f5AUVqM9M3GHCQydnSeUxXkwJWb3y6');
  
  // 获取余额
  const sharesBalance = await connection.getTokenAccountBalance(sharesAta);
  const pyusdBalance = await connection.getTokenAccountBalance(pyusdAccount);
  
  console.log('\n💰 账户余额:');
  console.log(`  钱包: ${wallet.toBase58()}`);
  console.log(`  PYUSD 余额: ${pyusdBalance.value.uiAmount} PYUSD`);
  console.log(`  Vault Shares: ${sharesBalance.value.uiAmount} shares`);
  
  console.log('\n📋 最近的存款交易:');
  const signatures = await connection.getSignaturesForAddress(sharesAta, { limit: 3 });
  
  for (const sig of signatures) {
    const tx = await connection.getParsedTransaction(sig.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed'
    });
    
    if (tx && tx.meta) {
      const date = new Date((sig.blockTime || 0) * 1000);
      console.log(`\n  📅 ${date.toLocaleString('zh-CN')}`);
      console.log(`  📝 签名: ${sig.signature}`);
      console.log(`  ✅ 状态: ${sig.err ? '失败' : '成功'}`);
      
      // 找出 shares 变化
      if (tx.meta.preTokenBalances && tx.meta.postTokenBalances) {
        for (const post of tx.meta.postTokenBalances) {
          if (post.owner === wallet.toBase58()) {
            const pre = tx.meta.preTokenBalances.find(p => p.accountIndex === post.accountIndex);
            if (pre) {
              const change = Number(post.uiTokenAmount.uiAmount || 0) - Number(pre.uiTokenAmount.uiAmount || 0);
              if (change !== 0) {
                const isMint = post.mint === 'DCqyVY1SFCwq8unnexv9pjujVAC7jsmjfoUWBrNLvbY'; // shares mint
                if (isMint && change > 0) {
                  console.log(`  💎 获得 Shares: +${change.toFixed(6)}`);
                } else if (!isMint && change < 0) {
                  console.log(`  💸 存入 PYUSD: ${change.toFixed(6)}`);
                }
              }
            } else if (post.mint === 'DCqyVY1SFCwq8unnexv9pjujVAC7jsmjfoUWBrNLvbY') {
              console.log(`  💎 获得 Shares: ${post.uiTokenAmount.uiAmount}`);
            }
          }
        }
      }
      
      console.log(`  🔗 查看: https://solscan.io/tx/${sig.signature}`);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('\n🌐 重要链接:\n');
  
  console.log('📊 Kamino Vault (查看 APY、TVL、存取款):');
  console.log(`   https://kamino.finance/earn/${vault.toBase58()}\n`);
  
  console.log('💎 你的 Shares 账户 (查看余额、交易历史):');
  console.log(`   https://solscan.io/account/${sharesAta.toBase58()}\n`);
  
  console.log('💰 你的 PYUSD 账户:');
  console.log(`   https://solscan.io/account/${pyusdAccount.toBase58()}\n`);
  
  console.log('🏦 Vault 详情 (链上数据):');
  console.log(`   https://solscan.io/account/${vault.toBase58()}\n`);
  
  console.log('=' .repeat(60));
  console.log('\n💡 操作指南:\n');
  
  console.log('1️⃣  查看收益:');
  console.log('   访问 Kamino 网站，连接钱包后可以看到实时收益\n');
  
  console.log('2️⃣  取款:');
  console.log('   - 方式1: 在 Kamino 网站点击 "Withdraw"');
  console.log('   - 方式2: 通过 Mars 合约调用 kamino_withdraw\n');
  
  console.log('3️⃣  查看 APY:');
  console.log('   在 Kamino 页面可以看到当前年化收益率\n');
  
  console.log('4️⃣  Shares 说明:');
  console.log('   - Shares = 你在 vault 中的份额凭证');
  console.log('   - 持有 shares 自动累积收益');
  console.log('   - 取款时用 shares 换回 PYUSD（本金+利息）');
  
  console.log('\n' + '=' .repeat(60));
  
  // 计算大概价值
  console.log('\n📊 当前估值:\n');
  const depositAmount = 5.0; // 初始存入
  const currentShares = Number(sharesBalance.value.uiAmount);
  
  console.log(`  存入金额: ${depositAmount.toFixed(6)} PYUSD`);
  console.log(`  当前 Shares: ${currentShares.toFixed(6)}`);
  console.log(`  Exchange Rate: ~1 share ≈ 1 PYUSD (初始)`);
  console.log(`\n  💡 随着时间推移，每个 share 的价值会增长`);
  console.log(`     这就是你的收益！`);
}

showDepositSummary().catch(console.error);
