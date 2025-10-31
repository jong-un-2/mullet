/**
 * TRON LiFi 集成
 * 用于在 LiFi SDK 中集成 TRON 支持
 */

import { tronService } from './tronService';
import { TRON_CHAIN_ID } from './marsLiFiService';

/**
 * 创建 TRON Signer 用于 LiFi SDK
 */
export const createTronSigner = async () => {
  const walletInfo = tronService.getWalletInfo();
  
  if (!walletInfo) {
    throw new Error('TRON wallet not connected');
  }

  return {
    getAddress: async () => walletInfo.address,
    signMessage: async (message: string) => {
      const tronWeb = (window as any).tronWeb;
      if (!tronWeb) {
        throw new Error('TronWeb not available');
      }
      return tronWeb.trx.sign(message);
    },
    signTransaction: async (transaction: any) => {
      const tronWeb = (window as any).tronWeb;
      if (!tronWeb) {
        throw new Error('TronWeb not available');
      }
      return tronWeb.trx.sign(transaction);
    },
  };
};

/**
 * 获取 TRON Provider 用于 LiFi SDK
 */
export const getTronProvider = () => {
  const tronWeb = (window as any).tronWeb;
  
  if (!tronWeb) {
    throw new Error('TronWeb not available. Please connect TronLink wallet.');
  }

  return {
    request: async ({ method, params }: { method: string; params?: any[] }) => {
      switch (method) {
        case 'tron_requestAccounts':
          return [tronWeb.defaultAddress.base58];
        
        case 'tron_getBalance':
          const address = params?.[0] || tronWeb.defaultAddress.base58;
          return tronWeb.trx.getBalance(address);
        
        case 'tron_sendTransaction':
          const tx = params?.[0];
          const signedTx = await tronWeb.trx.sign(tx);
          return tronWeb.trx.sendRawTransaction(signedTx);
        
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    },
    
    on: (event: string, callback: (...args: any[]) => void) => {
      // TronLink event listeners
      if (event === 'accountsChanged') {
        window.addEventListener('message', (e) => {
          if (e.data.message && e.data.message.action === 'accountsChanged') {
            callback(e.data.message.data.address);
          }
        });
      }
    },
    
    removeListener: (_event: string, _callback: (...args: any[]) => void) => {
      // Cleanup if needed
    },
  };
};

/**
 * 检查是否已连接 TRON 钱包
 */
export const isTronConnected = (): boolean => {
  const tronWeb = (window as any).tronWeb;
  return !!(tronWeb && tronWeb.defaultAddress && tronWeb.defaultAddress.base58);
};

/**
 * 获取 TRON 地址
 */
export const getTronAddress = (): string | null => {
  const tronWeb = (window as any).tronWeb;
  return tronWeb?.defaultAddress?.base58 || null;
};

/**
 * 为 LiFi SDK 创建 TRON Wallet Adapter
 */
export const createTronWalletAdapter = () => {
  return {
    getWalletClient: async () => {
      const signer = await createTronSigner();
      return {
        account: await signer.getAddress(),
        chain: {
          id: TRON_CHAIN_ID,
          name: 'TRON',
          nativeCurrency: {
            name: 'TRX',
            symbol: 'TRX',
            decimals: 6,
          },
        },
        transport: getTronProvider(),
        signTransaction: signer.signTransaction,
        signMessage: signer.signMessage,
      };
    },
  };
};

/**
 * 执行 TRON 交易（用于 LiFi 路由）
 */
export const executeTronTransaction = async (transaction: any): Promise<string> => {
  const tronWeb = (window as any).tronWeb;
  
  if (!tronWeb) {
    throw new Error('TronWeb not available');
  }

  try {
    console.log('🔵 Executing TRON transaction:', transaction);
    
    // Sign and send transaction
    const signedTx = await tronWeb.trx.sign(transaction);
    const result = await tronWeb.trx.sendRawTransaction(signedTx);
    
    if (!result.result) {
      throw new Error('Transaction failed');
    }
    
    console.log('✅ TRON transaction sent:', result.txid);
    return result.txid;
  } catch (error) {
    console.error('❌ Failed to execute TRON transaction:', error);
    throw error;
  }
};

/**
 * 等待 TRON 交易确认
 */
export const waitForTronTransaction = async (
  txId: string,
  timeout = 60000
): Promise<boolean> => {
  const tronWeb = (window as any).tronWeb;
  
  if (!tronWeb) {
    throw new Error('TronWeb not available');
  }

  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const txInfo = await tronWeb.trx.getTransactionInfo(txId);
      
      if (txInfo && txInfo.id) {
        console.log('✅ TRON transaction confirmed:', txId);
        return true;
      }
    } catch (error) {
      // Transaction not found yet, continue waiting
    }
    
    // Wait 3 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  throw new Error('Transaction confirmation timeout');
};
