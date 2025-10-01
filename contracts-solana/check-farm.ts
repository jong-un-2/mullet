import { Connection, PublicKey } from '@solana/web3.js';
import { HELIUS_RPC } from './constants';

const connection = new Connection(HELIUS_RPC, 'confirmed');

async function checkFarm() {
  console.log('🔍 检查 Vault 是否有关联的 Farm...\n');
  console.log('=' .repeat(70));
  
  const vault = new PublicKey('A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK');
  
  // 获取 vault 账户数据
  const vaultAccount = await connection.getAccountInfo(vault);
  if (!vaultAccount) {
    console.log('❌ Vault 不存在');
    return;
  }
  
  const data = vaultAccount.data;
  
  // VaultState 结构中的 farm 字段位置
  // 我们需要找到 farm 相关的字段
  // 通常在 VaultState 的后面部分
  
  console.log('📋 Vault 数据长度:', data.length, 'bytes\n');
  
  // 检查最近的交易是否有 Farm 调用
  console.log('🔍 检查最近的交易是否涉及 Farm...\n');
  
  const sig = '48bQfA361DsT9FjNpetAV6HR4x6Cw8nPKwMdJrXVL6FCSJGjjXxkXZBpM4RZ2FitvTcqVraGfdET4sJr15PNGzjS';
  
  const tx = await connection.getParsedTransaction(sig, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed'
  });
  
  if (!tx || !tx.meta) {
    console.log('❌ 交易未找到');
    return;
  }
  
  // 检查所有涉及的程序
  const programs = new Set<string>();
  
  if (tx.meta.logMessages) {
    console.log('📜 检查日志中的程序调用:\n');
    
    for (const log of tx.meta.logMessages) {
      const invokeMatch = log.match(/Program (.+?) invoke \[(\d+)\]/);
      if (invokeMatch) {
        const program = invokeMatch[1];
        programs.add(program);
      }
    }
    
    // 列出所有程序
    const programNames: { [key: string]: string } = {
      'AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8': 'Mars Program V3',
      'KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd': 'Kamino Vault Program',
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'Associated Token Account Program',
      'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb': 'Token-2022 Program',
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'Token Program',
      'KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD': 'Klend Program',
      '11111111111111111111111111111111': 'System Program',
      'FarmsPZpWu9i7Kky8tPN37rs2TpmMrAZrC7S7vJa91Hr': 'Kamino Farms Program',
      'FarmqiPv5eAj3j1GMdMCMUGXqPUvmquZtMy86QH6rzhG': 'Kamino Farms Program (Old)',
    };
    
    console.log('所有涉及的程序:\n');
    programs.forEach(program => {
      const name = programNames[program] || 'Unknown Program';
      const isFarm = name.includes('Farm');
      const marker = isFarm ? '🌾' : '📦';
      console.log(`  ${marker} ${name}`);
      console.log(`      ${program}\n`);
    });
  }
  
  console.log('=' .repeat(70));
  console.log('\n🔍 分析交易指令...\n');
  
  // 检查交易中的指令
  if (tx.transaction.message.instructions) {
    console.log(`交易包含 ${tx.transaction.message.instructions.length} 个指令:\n`);
    
    tx.transaction.message.instructions.forEach((ix, idx) => {
      if ('programId' in ix) {
        const programId = ix.programId.toBase58();
        const name = {
          'AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8': 'Mars Program',
          'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'ATA Program',
          'FarmsPZpWu9i7Kky8tPN37rs2TpmMrAZrC7S7vJa91Hr': 'Farms Program',
        }[programId] || 'Unknown';
        
        console.log(`  指令 ${idx + 1}: ${name}`);
        console.log(`    Program: ${programId}`);
        
        if ('parsed' in ix) {
          console.log(`    Type: ${ix.parsed?.type || 'N/A'}`);
        }
        console.log();
      }
    });
  }
  
  console.log('=' .repeat(70));
  console.log('\n💡 Farm 说明:\n');
  
  console.log('Kamino Vault 可能有关联的 Farm（质押池）用于：');
  console.log('  1. 提供额外的代币奖励（KMNO 或其他代币）');
  console.log('  2. 自动质押你的 vault shares');
  console.log('  3. 在获得 vault 收益的同时，获得 farm 奖励\n');
  
  console.log('如果交易包含 Farm 程序调用：');
  console.log('  ✅ 这是 SDK 自动添加的');
  console.log('  ✅ 会自动将你的 shares 质押到 farm');
  console.log('  ✅ 你可以同时获得两种收益：vault APY + farm 奖励\n');
  
  console.log('如果没有 Farm 程序调用：');
  console.log('  ℹ️  这个 vault 可能没有配置 farm');
  console.log('  ℹ️  或者 farm 已经结束');
  console.log('  ℹ️  你仍然会获得 vault 本身的收益\n');
}

checkFarm().catch(console.error);
