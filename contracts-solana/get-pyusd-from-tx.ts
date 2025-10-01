import { Connection, PublicKey } from "@solana/web3.js";
import { HELIUS_RPC, PYUSD_MINT } from "./constants";

async function main() {
    const connection = new Connection(HELIUS_RPC, "confirmed");
    const walletPubkey = new PublicKey("4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w");
    
    const signatures = await connection.getSignaturesForAddress(walletPubkey, { limit: 1 });
    
    const tx = await connection.getParsedTransaction(signatures[0].signature, {
        maxSupportedTransactionVersion: 0
    });
    
    console.log("🔍 从最新交易中查找 PYUSD 账户...\n");
    
    if (tx?.transaction?.message?.accountKeys) {
        const accountKeys = tx.transaction.message.accountKeys;
        
        for (let i = 0; i < accountKeys.length; i++) {
            const key = accountKeys[i];
            const pubkey = 'pubkey' in key ? key.pubkey : key;
            
            // 检查这个账户是否是 token 账户
            try {
                const accountInfo = await connection.getParsedAccountInfo(pubkey);
                if (accountInfo.value && 'parsed' in accountInfo.value.data) {
                    const parsed = accountInfo.value.data.parsed;
                    if (parsed.type === 'account' && parsed.info.mint === PYUSD_MINT.toString()) {
                        if (parsed.info.owner === walletPubkey.toString()) {
                            console.log("✅ 找到 PYUSD 账户!");
                            console.log("地址:", pubkey.toString());
                            console.log("余额:", parsed.info.tokenAmount.uiAmountString, "PYUSD");
                            console.log("");
                        }
                    }
                }
            } catch (e) {
                // ignore
            }
        }
    }
}

main().catch(console.error);
