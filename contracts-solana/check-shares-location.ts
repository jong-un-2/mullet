import { Connection, PublicKey } from '@solana/web3.js';
import { HELIUS_RPC } from './constants';

const connection = new Connection(HELIUS_RPC, 'confirmed');

async function checkSharesLocation() {
  console.log('🔍 检查你的 Shares 在哪里...\n');
  console.log('=' .repeat(70));
  
  const wallet = new PublicKey('4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w');
  const sharesMint = new PublicKey('DCqyVY1SFCwq8unnexv9pjujVAC7jsmjfoUWBrNLvbY');
  const sharesAta = new PublicKey('6rJuqfyCBEms6BTBtN6W1M3NB44k6YhmAY8TAqnpYtKq');
  
  console.log('\n📋 基本信息:');
  console.log(`  钱包: ${wallet.toBase58()}`);
  console.log(`  Shares Mint: ${sharesMint.toBase58()}`);
  
  // 1. 检查 shares ATA 余额
  console.log('\n💰 你的 Shares 余额 (未质押):');
  try {
    const sharesBalance = await connection.getTokenAccountBalance(sharesAta);
    console.log(`  ✅ Shares ATA: ${sharesAta.toBase58()}`);
    console.log(`  余额: ${sharesBalance.value.uiAmount} shares`);
    console.log(`  Raw: ${sharesBalance.value.amount}`);
    
    if (Number(sharesBalance.value.uiAmount) > 0) {
      console.log('\n  ⚠️  你的 shares 在钱包中，没有质押到 farm！');
      console.log('  这就是为什么官网看不到的原因。');
    }
  } catch (e: any) {
    console.log(`  ❌ 无法读取 shares 余额: ${e.message}`);
  }
  
  // 2. 查找所有包含这个 shares mint 的账户
  console.log('\n🔍 查找所有 Shares 相关账户...');
  
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    wallet,
    { mint: sharesMint }
  );
  
  console.log(`\n  找到 ${tokenAccounts.value.length} 个账户:\n`);
  
  for (const { pubkey, account } of tokenAccounts.value) {
    const data = account.data.parsed.info;
    console.log(`  📦 账户: ${pubkey.toBase58()}`);
    console.log(`     余额: ${data.tokenAmount.uiAmount} shares`);
    console.log(`     Owner: ${data.owner}`);
    console.log(`     状态: ${data.state || 'initialized'}\n`);
  }
  
  // 3. 检查是否有 farm 质押账户
  console.log('=' .repeat(70));
  console.log('\n🌾 检查 Farm 质押状态...\n');
  
  // Farm Program ID
  const farmProgram = new PublicKey('FarmsPZpWu9i7Kky8tPN37rs2TpmMrAZrC7S7vJa91Hr');
  
  console.log('  Farm Program:', farmProgram.toBase58());
  console.log('  正在查询你在 farm 中的账户...\n');
  
  try {
    // 查找 farm 相关的账户（user stake 账户）
    const accounts = await connection.getProgramAccounts(farmProgram, {
      filters: [
        {
          memcmp: {
            offset: 8, // 跳过 discriminator
            bytes: wallet.toBase58(),
          },
        },
      ],
    });
    
    if (accounts.length > 0) {
      console.log(`  ✅ 找到 ${accounts.length} 个 farm 质押账户:\n`);
      accounts.forEach(({ pubkey }) => {
        console.log(`     ${pubkey.toBase58()}`);
      });
    } else {
      console.log('  ❌ 没有找到 farm 质押账户');
      console.log('  这意味着你的 shares 没有质押到 farm！\n');
    }
  } catch (e: any) {
    console.log(`  ⚠️  查询 farm 账户失败: ${e.message}`);
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('\n💡 原因分析:\n');
  
  console.log('官方 Kamino 网站显示的是 **质押在 farm 中的余额**。');
  console.log('你通过 Mars 合约存款，shares 在你的钱包 ATA 中，');
  console.log('但 **没有质押到 farm**，所以官网看不到。\n');
  
  console.log('=' .repeat(70));
  console.log('\n🎯 解决方案:\n');
  
  console.log('方案 1: 在 Kamino 官网手动质押');
  console.log('  ✅ 访问: https://kamino.finance/earn/A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK');
  console.log('  ✅ 连接钱包');
  console.log('  ✅ 应该能看到"Stake to Farm"按钮');
  console.log('  ✅ 点击质押后，官网就能看到了\n');
  
  console.log('方案 2: 通过 Mars 合约添加 farm 质押功能');
  console.log('  需要实现 kamino_stake_in_farm 函数\n');
  
  console.log('方案 3: 直接取款');
  console.log('  你的 shares 在钱包中，可以正常取款');
  console.log('  不质押到 farm 只是拿不到 farm 奖励');
  console.log('  vault 的收益还是正常的\n');
  
  console.log('=' .repeat(70));
  console.log('\n🔗 查看链接:\n');
  console.log(`  Shares ATA: https://solscan.io/account/${sharesAta.toBase58()}`);
  console.log(`  Kamino Vault: https://kamino.finance/earn/A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK`);
  console.log('\n' + '=' .repeat(70));
}

checkSharesLocation().catch(console.error);
