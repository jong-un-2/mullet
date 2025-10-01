import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { createAssociatedTokenAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as fs from 'fs';
import { HELIUS_RPC } from './constants';

const connection = new Connection(HELIUS_RPC, 'confirmed');

const wallet = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync('./user.json', 'utf8')))
);

async function createSharesATA() {
  console.log('🚀 创建 Shares ATA...\n');
  
  const sharesMint = new PublicKey('DCqyVY1SFCwq8unnexv9pjujVAC7jsmjfoUWBrNLvbY');
  
  console.log(`📋 Wallet: ${wallet.publicKey.toBase58()}`);
  console.log(`📋 Shares Mint: ${sharesMint.toBase58()}`);
  console.log(`📋 Token Program: ${TOKEN_PROGRAM_ID.toBase58()} (Standard Token)\n`);
  
  try {
    const ata = await createAssociatedTokenAccount(
      connection,
      wallet,
      sharesMint,
      wallet.publicKey,
      undefined,
      TOKEN_PROGRAM_ID
    );
    
    console.log(`✅ Shares ATA 创建成功: ${ata.toBase58()}`);
    
  } catch (error: any) {
    console.error('❌ 创建失败:', error.message);
    process.exit(1);
  }
}

createSharesATA();
