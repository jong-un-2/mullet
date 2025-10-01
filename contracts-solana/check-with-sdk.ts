import { createDefaultRpcTransport, createRpc, createSolanaRpcApi } from '@solana/kit';
import { KaminoVault } from '@kamino-finance/klend-sdk';
import { HELIUS_RPC } from './constants';

const VAULT_ADDRESS = 'A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK' as any;

async function checkWithSDK() {
  console.log('🔍 使用 SDK 检查 Vault 状态...\n');
  
  const transport = createDefaultRpcTransport({ url: HELIUS_RPC });
  const rpc = createRpc({ api: createSolanaRpcApi(), transport });
  
  const vault = new KaminoVault(VAULT_ADDRESS);
  const vaultState = await vault.getState(rpc);
  
  console.log('📊 Vault 状态 (来自 SDK):');
  console.log('  Token Mint:', vaultState.tokenMint);
  console.log('  Token Decimals:', vaultState.tokenMintDecimals.toString());
  console.log('  Token Available:', vaultState.tokenAvailable.toString());
  console.log('  Shares Mint:', vaultState.sharesMint);
  console.log('  Shares Decimals:', vaultState.sharesMintDecimals.toString());
  console.log('  Shares Issued:', vaultState.sharesIssued.toString());
  
  // 计算 exchange rate
  const tokenAvailable = BigInt(vaultState.tokenAvailable.toString());
  const sharesIssued = BigInt(vaultState.sharesIssued.toString());
  
  if (sharesIssued > 0n) {
    const rate = Number(tokenAvailable) / Number(sharesIssued);
    console.log('\n💱 Exchange Rate:');
    console.log(`  1 share = ${rate} tokens`);
    
    // 你的 shares
    const yourShares = 4998845n; // 4.998845 shares
    const yourTokens = (yourShares * tokenAvailable) / sharesIssued;
    const decimals = Number(vaultState.tokenMintDecimals.toString());
    const yourTokensUI = Number(yourTokens) / (10 ** decimals);
    
    console.log('\n💰 你的存款:');
    console.log(`  Shares: ${Number(yourShares) / 1e6} shares`);
    console.log(`  价值: ${yourTokensUI.toFixed(6)} PYUSD`);
    
    const deposited = 5.0;
    const profit = yourTokensUI - deposited;
    console.log(`\n📈 收益:`);
    console.log(`  存入: ${deposited.toFixed(6)} PYUSD`);
    console.log(`  当前: ${yourTokensUI.toFixed(6)} PYUSD`);
    console.log(`  收益: ${profit >= 0 ? '+' : ''}${profit.toFixed(6)} PYUSD`);
  }
}

checkWithSDK().catch(console.error);
