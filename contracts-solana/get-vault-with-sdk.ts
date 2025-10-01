import { Connection, PublicKey } from '@solana/web3.js';

const VAULT = 'A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK';
const RPC = 'https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3';
const KAMINO_PROGRAM = 'KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd';

(async () => {
  const connection = new Connection(RPC, 'confirmed');
  const vaultPubkey = new PublicKey(VAULT);
  const vaultAccount = await connection.getAccountInfo(vaultPubkey);
  
  if (!vaultAccount) {
    console.log('❌ Vault 不存在');
    return;
  }
  
  console.log('🏦 Vault 原始数据分析\n');
  console.log('Owner:', vaultAccount.owner.toBase58());
  console.log('Data Length:', vaultAccount.data.length);
  console.log('');
  
  // 按照 Kamino V2 GlobalConfig 结构解析
  const data = vaultAccount.data;
  
  console.log('📋 解析 Vault 账户 (GlobalConfig 结构):\n');
  
  // Discriminator (8 bytes)
  console.log('Discriminator:', data.slice(0, 8).toString('hex'));
  
  let offset = 8;
  
  // tokenVault (32 bytes)
  const tokenVault = new PublicKey(data.slice(offset, offset + 32));
  console.log(`\n[offset ${offset}] tokenVault:`, tokenVault.toBase58());
  offset += 32;
  
  // sharesMint (32 bytes)
  const sharesMint = new PublicKey(data.slice(offset, offset + 32));
  console.log(`[offset ${offset}] sharesMint:`, sharesMint.toBase58());
  offset += 32;
  
  // tokenMint (32 bytes)
  const tokenMint = new PublicKey(data.slice(offset, offset + 32));
  console.log(`[offset ${offset}] tokenMint:`, tokenMint.toBase58());
  offset += 32;
  
  // baseVaultAuthority (32 bytes)
  const baseVaultAuthority = new PublicKey(data.slice(offset, offset + 32));
  console.log(`[offset ${offset}] baseVaultAuthority:`, baseVaultAuthority.toBase58());
  offset += 32;
  
  console.log('\n✅ 关键账户已解析！');
  console.log('\n🔍 验证账户存在性:');
  
  const accounts = [
    { name: 'tokenVault', pubkey: tokenVault },
    { name: 'sharesMint', pubkey: sharesMint },
    { name: 'tokenMint', pubkey: tokenMint },
    { name: 'baseVaultAuthority', pubkey: baseVaultAuthority },
  ];
  
  for (const acc of accounts) {
    const info = await connection.getAccountInfo(acc.pubkey);
    if (info) {
      console.log(`✅ ${acc.name}: 存在 (Owner: ${info.owner.toBase58().slice(0, 20)}..., ${info.data.length} bytes)`);
    } else {
      console.log(`❌ ${acc.name}: 不存在`);
    }
  }
  
  // 派生 token_vault PDA
  console.log('\n🔧 派生 PDAs:');
  const kaminoProgramId = new PublicKey(KAMINO_PROGRAM);
  const [tokenVaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('token_vault'), vaultPubkey.toBuffer()],
    kaminoProgramId
  );
  console.log('token_vault PDA:', tokenVaultPDA.toBase58());
  console.log('匹配?', tokenVaultPDA.equals(tokenVault) ? '✅ 是' : `❌ 否，vault 数据中是 ${tokenVault.toBase58()}`);
})();
