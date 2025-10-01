import { Connection, PublicKey } from '@solana/web3.js';
import { HELIUS_RPC } from './constants';

const connection = new Connection(HELIUS_RPC, 'confirmed');

async function checkVaultBalance() {
  console.log('🔍 检查你的 Kamino Vault 存款...\n');
  
  const wallet = new PublicKey('4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w');
  const vault = new PublicKey('A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK');
  const sharesMint = new PublicKey('DCqyVY1SFCwq8unnexv9pjujVAC7jsmjfoUWBrNLvbY');
  const sharesAta = new PublicKey('6rJuqfyCBEms6BTBtN6W1M3NB44k6YhmAY8TAqnpYtKq');
  
  console.log('📋 账户信息:');
  console.log('  钱包:', wallet.toBase58());
  console.log('  Vault:', vault.toBase58());
  console.log('  Shares Mint:', sharesMint.toBase58());
  console.log('  Shares ATA:', sharesAta.toBase58());
  
  // 1. 检查你的 shares 余额
  console.log('\n💰 你的 Shares 余额:');
  const sharesBalance = await connection.getTokenAccountBalance(sharesAta);
  console.log(`  Shares: ${sharesBalance.value.uiAmount}`);
  console.log(`  Shares (raw): ${sharesBalance.value.amount}`);
  
  // 2. 获取 vault 的 exchange rate (1 share = ? PYUSD)
  console.log('\n📊 Vault 状态:');
  const vaultAccount = await connection.getAccountInfo(vault);
  
  if (!vaultAccount) {
    console.log('  ❌ Vault 不存在');
    return;
  }
  
  const data = vaultAccount.data;
  
  // VaultState structure (从 Kamino SDK):
  // discriminator(8) + vaultAdminAuthority(32) + baseVaultAuthority(32) + baseVaultAuthorityBump(8) + 
  // tokenMint(32) + tokenMintDecimals(8) + tokenVault(32) + tokenProgram(32) + sharesMint(32) + 
  // sharesMintDecimals(8) + tokenAvailable(8) + sharesIssued(8) + ...
  
  let offset = 8; // discriminator
  offset += 32; // vaultAdminAuthority
  offset += 32; // baseVaultAuthority
  offset += 8;  // baseVaultAuthorityBump
  
  const tokenMint = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  
  const tokenMintDecimals = data.readUInt8(offset);
  offset += 8; // u64 但只用第一个字节
  
  offset += 32; // tokenVault
  offset += 32; // tokenProgram
  offset += 32; // sharesMint
  offset += 8;  // sharesMintDecimals
  
  // 现在在 tokenAvailable 和 sharesIssued
  const tokenAvailable = data.readBigUInt64LE(offset);
  offset += 8;
  const sharesIssued = data.readBigUInt64LE(offset);
  
  console.log('  Token Mint:', tokenMint.toBase58());
  console.log('  Token Decimals:', tokenMintDecimals);
  console.log('  Token Available:', tokenAvailable.toString());
  console.log('  Shares Issued:', sharesIssued.toString());
  
  // 3. 计算你的存款价值
  console.log('\n💵 你的存款价值:');
  
  const yourShares = BigInt(sharesBalance.value.amount);
  
  if (sharesIssued > 0n) {
    // 你的存款 = (你的shares / 总shares) * vault中的token总量
    const yourTokens = (yourShares * tokenAvailable) / sharesIssued;
    const yourTokensUI = Number(yourTokens) / (10 ** tokenMintDecimals);
    
    console.log(`  你拥有的 PYUSD: ${yourTokensUI.toFixed(6)} PYUSD`);
    console.log(`  (原始值: ${yourTokens.toString()})`);
    
    // 计算收益率
    const depositedAmount = 5.0; // 我们存了 5 PYUSD
    const currentValue = yourTokensUI;
    const profit = currentValue - depositedAmount;
    const profitPercent = (profit / depositedAmount) * 100;
    
    console.log(`\n📈 收益情况:`);
    console.log(`  存入金额: ${depositedAmount.toFixed(6)} PYUSD`);
    console.log(`  当前价值: ${currentValue.toFixed(6)} PYUSD`);
    console.log(`  收益: ${profit >= 0 ? '+' : ''}${profit.toFixed(6)} PYUSD (${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(4)}%)`);
    
    // Exchange rate
    const exchangeRate = Number(tokenAvailable) / Number(sharesIssued);
    console.log(`\n💱 当前汇率:`);
    console.log(`  1 share = ${exchangeRate.toFixed(6)} tokens`);
    console.log(`  你的 ${sharesBalance.value.uiAmount} shares 可兑换 ${yourTokensUI.toFixed(6)} PYUSD`);
  } else {
    console.log('  ⚠️  Vault 没有发行任何 shares');
  }
  
  // 4. 链接到 Kamino 网站查看
  console.log('\n🌐 在线查看:');
  console.log(`  Kamino Vault: https://kamino.finance/earn/${vault.toBase58()}`);
  console.log(`  Solscan (Vault): https://solscan.io/account/${vault.toBase58()}`);
  console.log(`  Solscan (你的 Shares): https://solscan.io/account/${sharesAta.toBase58()}`);
  
  // 5. 查看最近的交易
  console.log('\n📜 Shares 账户最近的交易:');
  const signatures = await connection.getSignaturesForAddress(sharesAta, { limit: 5 });
  
  for (const sig of signatures) {
    const date = new Date((sig.blockTime || 0) * 1000);
    console.log(`  ${date.toLocaleString('zh-CN')}`);
    console.log(`    签名: ${sig.signature}`);
    console.log(`    状态: ${sig.err ? '❌ 失败' : '✅ 成功'}`);
    console.log(`    Solscan: https://solscan.io/tx/${sig.signature}`);
    console.log();
  }
}

checkVaultBalance().catch(console.error);
