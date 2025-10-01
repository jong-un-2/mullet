import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3", "confirmed");

const accounts = [
  "2dQkXr1e9LBvT2QcfKrzZaWY6gGAAVoCjLgkWFk3Mhkj",  // index 8
  "2gc9Dm1eB6UgVYFBUN9bWks6Kes9PbWSaPaa9DqyvEiN",  // index 9
  "A8dytfD3E8niG872SJYhwuXV5xmTyozzFKYzhn3zL2wG",  // index 11 (thought was shares mint)
  "DnpGhhzxN1ZFLuiFvtk3aLKGQ4KsML4DAXAZ5u4mrPd8",  // index 12
];

async function main() {
  for (const acc of accounts) {
    console.log(`\n📋 ${acc}`);
    const pubkey = new PublicKey(acc);
    const info = await connection.getAccountInfo(pubkey);
    if (info) {
      console.log(`   Owner: ${info.owner.toBase58()}`);
      console.log(`   Data Length: ${info.data.length}`);
      console.log(`   Lamports: ${info.lamports}`);
      
      // Check if it's a mint (165 bytes)
      if (info.data.length === 82 || info.data.length === 165) {
        console.log(`   🎯 这可能是 Mint 账户!`);
      }
    } else {
      console.log(`   ❌ 账户不存在`);
    }
  }
}

main().catch(console.error);
