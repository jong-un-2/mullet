import { Connection, PublicKey } from '@solana/web3.js';
import { HELIUS_RPC } from './constants';

const connection = new Connection(HELIUS_RPC, 'confirmed');

async function analyzeTransaction() {
  console.log('🔍 分析交易中的程序调用\n');
  console.log('=' .repeat(70));
  
  const sig = '48bQfA361DsT9FjNpetAV6HR4x6Cw8nPKwMdJrXVL6FCSJGjjXxkXZBpM4RZ2FitvTcqVraGfdET4sJr15PNGzjS';
  
  const tx = await connection.getParsedTransaction(sig, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed'
  });
  
  if (!tx || !tx.meta) {
    console.log('❌ 交易未找到');
    return;
  }
  
  console.log('\n📋 交易基本信息:\n');
  console.log(`  签名: ${sig}`);
  console.log(`  状态: ${tx.meta.err ? '❌ 失败' : '✅ 成功'}`);
  console.log(`  Solscan: https://solscan.io/tx/${sig}`);
  
  console.log('\n' + '=' .repeat(70));
  console.log('\n🔄 程序调用链:\n');
  
  const programNames: { [key: string]: string } = {
    'AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8': 'Mars Program V3 (你的合约)',
    'KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd': 'Kamino Vault Program',
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'Associated Token Account Program (官方)',
    'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb': 'Token-2022 Program (官方)',
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'Token Program (官方)',
    'KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD': 'Klend Program',
    '11111111111111111111111111111111': 'System Program (官方)',
  };
  
  // 解析日志找出程序调用
  if (tx.meta.logMessages) {
    let currentDepth = 0;
    const invokeStack: string[] = [];
    
    for (const log of tx.meta.logMessages) {
      // 检测 invoke
      const invokeMatch = log.match(/Program (.+?) invoke \[(\d+)\]/);
      if (invokeMatch) {
        const program = invokeMatch[1];
        const depth = parseInt(invokeMatch[2]);
        currentDepth = depth;
        
        const indent = '  '.repeat(depth - 1);
        const arrow = depth > 1 ? '└─ ' : '';
        const name = programNames[program] || 'Unknown Program';
        
        console.log(`${indent}${arrow}📦 [Level ${depth}] ${name}`);
        console.log(`${indent}    ${program}`);
        
        invokeStack.push(program);
      }
      
      // 检测 success/consumed
      const successMatch = log.match(/Program (.+?) success/);
      if (successMatch) {
        // Program completed successfully
      }
      
      // 检测程序日志
      const logMatch = log.match(/Program log: (.+)/);
      if (logMatch) {
        const message = logMatch[1];
        // 只显示重要的日志
        if (message.includes('🚀') || message.includes('📋') || message.includes('Instruction:') || message.includes('shares')) {
          const indent = '  '.repeat(currentDepth);
          console.log(`${indent}  💬 ${message}`);
        }
      }
    }
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('\n📊 涉及的程序说明:\n');
  
  // 获取交易中的唯一程序
  const programs = new Set<string>();
  if (tx.transaction.message.accountKeys) {
    for (const key of tx.transaction.message.accountKeys) {
      const pubkey = key.pubkey.toBase58();
      if (programNames[pubkey]) {
        programs.add(pubkey);
      }
    }
  }
  
  console.log('1️⃣  Mars Program V3 (你的合约)');
  console.log('    地址: AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8');
  console.log('    作用: 接收用户调用，验证参数，CPI 到 Kamino');
  console.log('    特点: 支持 Token-2022，自动处理 remaining_accounts\n');
  
  console.log('2️⃣  Kamino Vault Program');
  console.log('    地址: KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd');
  console.log('    作用: 管理 vault，执行存取款逻辑');
  console.log('    特点: 通过 CPI 被 Mars 调用\n');
  
  console.log('3️⃣  Associated Token Account Program (官方)');
  console.log('    地址: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
  console.log('    作用: 创建和管理关联代币账户 (ATA)');
  console.log('    特点: Solana 官方程序，所有人都用\n');
  
  console.log('4️⃣  Token-2022 Program (官方)');
  console.log('    地址: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
  console.log('    作用: 处理 PYUSD (Token-2022) 的转账');
  console.log('    特点: Token Extensions 支持\n');
  
  console.log('5️⃣  Token Program (官方)');
  console.log('    地址: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  console.log('    作用: 处理 Shares (SPL Token) 的铸造');
  console.log('    特点: 标准 SPL Token 程序\n');
  
  console.log('=' .repeat(70));
  console.log('\n💡 总结:\n');
  
  console.log('✅ Solscan 显示两个程序是正常的:');
  console.log('   - Mars Program: 你直接调用的');
  console.log('   - ATA Program: SDK 自动添加的指令\n');
  
  console.log('✅ 其他程序通过 CPI (跨程序调用) 执行:');
  console.log('   - Kamino Vault (被 Mars CPI 调用)');
  console.log('   - Token Programs (被 Kamino CPI 调用)\n');
  
  console.log('✅ 这是 Solana 程序组合性 (Composability) 的体现:');
  console.log('   - 一个程序可以调用其他程序');
  console.log('   - 原子性执行，要么全成功，要么全失败');
  console.log('   - 用户体验简单，底层逻辑复杂\n');
  
  console.log('=' .repeat(70));
  
  console.log('\n📜 Token 余额变化:\n');
  
  if (tx.meta.preTokenBalances && tx.meta.postTokenBalances) {
    const changes: { [key: string]: { pre: number, post: number, mint: string, owner: string } } = {};
    
    tx.meta.postTokenBalances.forEach(post => {
      const pre = tx.meta!.preTokenBalances!.find(p => p.accountIndex === post.accountIndex);
      const preAmount = pre ? Number(pre.uiTokenAmount.uiAmount || 0) : 0;
      const postAmount = Number(post.uiTokenAmount.uiAmount || 0);
      
      changes[post.accountIndex] = {
        pre: preAmount,
        post: postAmount,
        mint: post.mint,
        owner: post.owner || 'Unknown'
      };
    });
    
    for (const [index, change] of Object.entries(changes)) {
      const diff = change.post - change.pre;
      if (diff !== 0) {
        const tokenName = change.mint === '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo' ? 'PYUSD' :
                         change.mint === 'DCqyVY1SFCwq8unnexv9pjujVAC7jsmjfoUWBrNLvbY' ? 'Shares' : 'Unknown';
        
        console.log(`  ${tokenName}:`);
        console.log(`    前: ${change.pre.toFixed(6)}`);
        console.log(`    后: ${change.post.toFixed(6)}`);
        console.log(`    变化: ${diff >= 0 ? '+' : ''}${diff.toFixed(6)}`);
        console.log(`    Owner: ${change.owner}\n`);
      }
    }
  }
  
  console.log('=' .repeat(70));
}

analyzeTransaction().catch(console.error);
