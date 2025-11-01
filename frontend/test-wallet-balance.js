#!/usr/bin/env node

const { Connection, PublicKey } = require('@solana/web3.js');

async function testWalletBalance() {
  // Test with your wallet address that has USDC
  const walletAddress = 'A7iVLhNhLNaH4q8SZAZVceLUVowisGncQ9gwHVZKc8j6';
  const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  
  console.log('🔍 Testing wallet:', walletAddress);
  
  // Use Helius RPC endpoint from env or fallback
  const rpcUrl = process.env.VITE_SOLANA_MAINNET_RPC || 'https://rpc.ankr.com/solana/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3';
  
  try {
    console.log(`\n🌐 Testing RPC: ${rpcUrl}`);
    const connection = new Connection(rpcUrl, 'confirmed');
      const walletPublicKey = new PublicKey(walletAddress);
      
      // Test SOL balance
      try {
        const solBalance = await connection.getBalance(walletPublicKey);
        const solAmount = solBalance / 1e9;
        console.log(`💰 SOL balance: ${solAmount.toFixed(4)}`);
      } catch (err) {
        console.log(`❌ SOL balance error:`, err.message);
      }
      
      // Test USDC balance
      try {
        const tokenAccounts = await connection.getTokenAccountsByOwner(walletPublicKey, {
          mint: new PublicKey(usdcMint)
        });
        
        console.log(`🔢 Found ${tokenAccounts.value.length} USDC token accounts`);
        
        if (tokenAccounts.value.length > 0) {
          for (let i = 0; i < tokenAccounts.value.length; i++) {
            const accountInfo = await connection.getTokenAccountBalance(tokenAccounts.value[i].pubkey);
            const usdcBalance = accountInfo.value.uiAmountString || '0';
            console.log(`💰 USDC account ${i + 1} balance: ${usdcBalance}`);
          }
        } else {
          console.log('💰 No USDC token accounts found');
        }
      } catch (err) {
        console.log(`❌ USDC balance error:`, err.message);
      }
      
      // Test completed successfully
      return;
      
    } catch (err) {
      console.log(`❌ RPC ${rpcUrl} failed:`, err.message);
    }
}

// Test completed - direct fetch test removed

async function main() {
  console.log('🚀 Starting wallet balance test...\n');
  
  await testWalletBalance();
  
  console.log('\n✅ Test completed');
}

main().catch(console.error);