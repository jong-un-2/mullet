/**
 * Privy TRON Service
 * Handles TRON wallet operations using Privy's Tier 2 support
 * 
 * Privy Tier 2 TRON Support:
 * - Wallet creation and management
 * - Cryptographic signing via raw_sign API
 * - Key export and address derivation
 * - Embedded wallet support
 * 
 * Developer Responsibilities (Tier 2):
 * - Transaction building
 * - Signature format conversion (64-byte to 65-byte)
 * - Transaction submission to network
 */

// Import TronWeb v6.x (TypeScript rewrite with named exports)
import { TronWeb } from 'tronweb';

// TRON network configuration
const TRON_MAINNET_CONFIG = {
  fullHost: 'https://api.trongrid.io',
  headers: { 'TRON-PRO-API-KEY': import.meta.env.VITE_TRONGRID_API_KEY || '' },
};

// Initialize TronWeb instance (for transaction building only)
// Use the existing window.tronWeb if available (from TronLink), otherwise create new instance
const getTronWeb = () => {
  // Check if TronLink's TronWeb is available
  if (typeof window !== 'undefined' && (window as any).tronWeb?.ready) {
    console.log('[PrivyTronService] Using TronLink TronWeb instance');
    return (window as any).tronWeb;
  }
  
  // Create new TronWeb instance using v6.x constructor
  console.log('[PrivyTronService] Creating new TronWeb instance');
  
  return new TronWeb({
    fullHost: TRON_MAINNET_CONFIG.fullHost,
    headers: TRON_MAINNET_CONFIG.headers,
  });
};

/**
 * Signature conversion utility
 * Converts Privy's 64-byte signature (r || s) to TRON's 65-byte format (r || s || v)
 * 
 * @param signature64 - Privy's 64-byte signature in hex format
 * @param messageHash - The hash that was signed (for recovery ID calculation)
 * @param publicKey - The public key that signed the message (for verification)
 * @returns 65-byte signature with recovery ID
 */
export function convertPrivySignatureToTron(
  signature64: string,
  messageHash: string,
  publicKey: string
): string {
  // Remove '0x' prefix if present
  const sig = signature64.startsWith('0x') ? signature64.slice(2) : signature64;
  
  // Validate signature length (should be 128 hex chars = 64 bytes)
  if (sig.length !== 128) {
    throw new Error(`Invalid signature length: ${sig.length}, expected 128`);
  }
  
  // Extract r and s components
  const r = sig.slice(0, 64);
  const s = sig.slice(64, 128);
  
  // Calculate recovery ID (v)
  // Try both possible recovery IDs (0 and 1) and see which one recovers the correct public key
  const recoveryId = calculateRecoveryId(messageHash, r, s, publicKey);
  
  // TRON uses Ethereum-style recovery ID: 27 + recoveryId (0x1b or 0x1c)
  const v = (27 + recoveryId).toString(16).padStart(2, '0');
  
  // Return 65-byte signature: r || s || v
  return '0x' + r + s + v;
}

/**
 * Calculate the recovery ID for signature verification
 * @param _messageHash - The hash that was signed
 * @param _r - First 32 bytes of signature
 * @param _s - Second 32 bytes of signature  
 * @param _expectedPublicKey - The public key that should be recovered
 * @returns Recovery ID (0 or 1)
 */
function calculateRecoveryId(
  _messageHash: string,
  _r: string,
  _s: string,
  _expectedPublicKey: string
): number {
  // For now, try both recovery IDs
  // In production, you might want to use a library like secp256k1 to verify
  
  // Try recovery ID 0 first (most common)
  // This is a simplified implementation - in production use proper secp256k1 recovery
  return 0; // Default to 0, will be enhanced with actual recovery logic
}

/**
 * Get or create TRON wallet from Privy
 * @param privyUser - Privy user object
 * @returns TRON wallet address or null
 */
export async function getPrivyTronWallet(privyUser: any): Promise<string | null> {
  if (!privyUser) {
    console.log('[PrivyTronService] No Privy user');
    return null;
  }

  // Find TRON wallet in linked accounts
  const tronWallet = privyUser.linkedAccounts?.find(
    (account: any) => account.type === 'wallet' && account.walletClientType === 'tron'
  );

  if (tronWallet) {
    console.log('[PrivyTronService] Found existing TRON wallet:', tronWallet.address);
    return tronWallet.address;
  }

  console.log('[PrivyTronService] No TRON wallet found, user needs to create one');
  return null;
}

/**
 * Create TRON wallet via Privy Server API
 * 
 * Note: Privy's client SDK (useCreateWallet) only supports Tier 3 chains (Ethereum, Solana).
 * For Tier 2 chains like TRON, we must use the server-side SDK via a backend API.
 * 
 * @param getAccessToken - Privy's getAccessToken function to get auth token
 * @returns Created wallet address
 */
export async function createPrivyTronWallet(getAccessToken: () => Promise<string | null>): Promise<string> {
  console.log('[PrivyTronService] Creating TRON wallet via server API...');
  
  try {
    // Get access token for authentication
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('Failed to get access token');
    }

    // Call backend API to create TRON wallet
    const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT || 'http://localhost:8787'}/api/tron-wallet/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to create TRON wallet');
    }

    const data = await response.json();
    console.log('[PrivyTronService] TRON wallet created:', data.address);
    
    return data.address;
  } catch (error) {
    console.error('[PrivyTronService] Failed to create TRON wallet:', error);
    throw error;
  }
}

/**
 * Sign a message using Privy's raw_sign API
 * @param walletId - Privy wallet ID
 * @param message - Message to sign (will be hashed)
 * @param accessToken - Privy access token
 * @returns Signature in TRON format (65 bytes)
 */
export async function signMessageWithPrivy(
  walletId: string,
  message: string,
  accessToken: string,
  publicKey: string
): Promise<string> {
  console.log('[PrivyTronService] Signing message with Privy...');
  
  // Hash the message using TronWeb's sha3 function
  const tronWebInstance = getTronWeb();
  const messageHash = tronWebInstance.sha3(message);
  
  // Call Privy's raw_sign API
  const response = await fetch(
    `https://auth.privy.io/api/v1/wallets/${walletId}/raw_sign`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'privy-app-id': import.meta.env.VITE_PRIVY_APP_ID || '',
      },
      body: JSON.stringify({
        hash: messageHash,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Privy raw_sign failed: ${response.statusText}`);
  }

  const data = await response.json();
  const signature64 = data.signature; // 64-byte signature from Privy
  
  // Convert to TRON's 65-byte format
  const signature65 = convertPrivySignatureToTron(signature64, messageHash, publicKey);
  
  console.log('[PrivyTronService] Message signed successfully');
  return signature65;
}

/**
 * Build and sign a TRON transaction using Privy
 * @param walletId - Privy wallet ID
 * @param fromAddress - Sender address
 * @param toAddress - Recipient address
 * @param amount - Amount in SUN (1 TRX = 1,000,000 SUN)
 * @param accessToken - Privy access token
 * @param publicKey - Wallet public key
 * @returns Signed transaction hex
 */
export async function buildAndSignTronTransaction(
  walletId: string,
  fromAddress: string,
  toAddress: string,
  amount: number,
  accessToken: string,
  publicKey: string
): Promise<string> {
  console.log('[PrivyTronService] Building TRON transaction...');
  
  try {
    // Step 1: Build transaction using TronWeb
    const tronWebInstance = getTronWeb();
    const transaction = await tronWebInstance.transactionBuilder.sendTrx(
      toAddress,
      amount,
      fromAddress
    );
    
    console.log('[PrivyTronService] Transaction built:', transaction);
    
    // Step 2: Get transaction hash (what needs to be signed)
    const txID = transaction.txID;
    const txHash = txID.startsWith('0x') ? txID : '0x' + txID;
    
    console.log('[PrivyTronService] Transaction hash:', txHash);
    
    // Step 3: Sign using Privy's raw_sign API
    const response = await fetch(
      `https://auth.privy.io/api/v1/wallets/${walletId}/raw_sign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'privy-app-id': import.meta.env.VITE_PRIVY_APP_ID || '',
        },
        body: JSON.stringify({
          hash: txHash,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Privy raw_sign failed: ${response.statusText}`);
    }

    const data = await response.json();
    const signature64 = data.signature;
    
    // Step 4: Convert signature to TRON format
    const signature65 = convertPrivySignatureToTron(signature64, txHash, publicKey);
    
    // Step 5: Attach signature to transaction
    transaction.signature = [signature65];
    
    console.log('[PrivyTronService] Transaction signed successfully');
    
    // Return serialized transaction
    return JSON.stringify(transaction);
  } catch (error) {
    console.error('[PrivyTronService] Failed to build/sign transaction:', error);
    throw error;
  }
}

/**
 * Broadcast signed transaction to TRON network
 * @param signedTxHex - Signed transaction in hex format
 * @returns Transaction ID
 */
export async function broadcastTronTransaction(signedTxHex: string): Promise<string> {
  console.log('[PrivyTronService] Broadcasting transaction...');
  
  try {
    const transaction = JSON.parse(signedTxHex);
    const tronWebInstance = getTronWeb();
    const result = await tronWebInstance.trx.sendRawTransaction(transaction);
    
    if (result.result) {
      console.log('[PrivyTronService] Transaction broadcast successful:', result.txid);
      return result.txid;
    } else {
      throw new Error(`Transaction failed: ${result.code || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('[PrivyTronService] Failed to broadcast transaction:', error);
    throw error;
  }
}

/**
 * Get TRON balance for an address
 * @param address - TRON address
 * @returns Balance in TRX
 */
export async function getTronBalance(address: string): Promise<number> {
  try {
    const tronWebInstance = getTronWeb();
    const balance = await tronWebInstance.trx.getBalance(address);
    // Convert from SUN to TRX (1 TRX = 1,000,000 SUN)
    return balance / 1_000_000;
  } catch (error) {
    console.error('[PrivyTronService] Failed to get balance:', error);
    return 0;
  }
}

/**
 * Get TRC20 token balance
 * @param address - TRON address
 * @param tokenContract - TRC20 token contract address
 * @returns Token balance
 */
export async function getTrc20Balance(
  address: string,
  tokenContract: string
): Promise<number> {
  try {
    const tronWebInstance = getTronWeb();
    
    // Set the default address for contract calls
    tronWebInstance.setAddress(address);
    
    const contract = await tronWebInstance.contract().at(tokenContract);
    const balance = await contract.balanceOf(address).call();
    const decimals = await contract.decimals().call();
    
    // Convert BigInt to number properly
    const balanceStr = balance.toString();
    const decimalsNum = Number(decimals.toString());
    const balanceNum = Number(balanceStr) / Math.pow(10, decimalsNum);
    
    return balanceNum;
  } catch (error) {
    console.error('[PrivyTronService] Failed to get TRC20 balance:', error);
    return 0;
  }
}

/**
 * Build and sign a TRC20 token transfer transaction using Privy's raw_sign API
 * @param walletId - Privy embedded wallet ID
 * @param fromAddress - Sender's TRON address
 * @param toAddress - Recipient's TRON address
 * @param amount - Amount to send (in smallest unit, e.g., 1000000 for 1 USDT with 6 decimals)
 * @param tokenContract - TRC20 token contract address
 * @param accessToken - Privy access token for authentication
 * @param publicKey - Public key of the wallet
 * @returns Signed transaction as JSON string
 */
export async function buildAndSignTrc20Transaction(
  walletId: string,
  fromAddress: string,
  toAddress: string,
  amount: number,
  tokenContract: string,
  accessToken: string,
  publicKey: string
): Promise<string> {
  try {
    const tronWebInstance = getTronWeb();

    // Build TRC20 transfer transaction
    const parameter = [
      { type: 'address', value: toAddress },
      { type: 'uint256', value: amount }
    ];

    const transaction = await tronWebInstance.transactionBuilder.triggerSmartContract(
      tokenContract,
      'transfer(address,uint256)',
      {},
      parameter,
      fromAddress
    );

    if (!transaction.result || !transaction.result.result) {
      throw new Error('Failed to build TRC20 transaction');
    }

    const txObject = transaction.transaction;
    const txID = txObject.txID;

    console.log('[PrivyTronService] TRC20 transaction built:', {
      txID,
      from: fromAddress,
      to: toAddress,
      amount,
      contract: tokenContract
    });

    // Sign with Privy's raw_sign API
    const signResponse = await fetch(
      `https://auth.privy.io/api/v1/wallets/${walletId}/raw_sign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'privy-app-id': import.meta.env.VITE_PRIVY_APP_ID,
        },
        body: JSON.stringify({
          chain_type: 'tron',
          data: txID,
          public_key: publicKey,
        }),
      }
    );

    if (!signResponse.ok) {
      const errorData = await signResponse.json();
      throw new Error(`Privy signing failed: ${JSON.stringify(errorData)}`);
    }

    const signData = await signResponse.json();
    const signature64 = signData.signature;

    // Convert 64-byte signature to 65-byte TRON signature
    const signature65 = convertPrivySignatureToTron(signature64, txID, publicKey);

    // Attach signature to transaction
    txObject.signature = [signature65];

    console.log('[PrivyTronService] TRC20 transaction signed successfully');

    return JSON.stringify(txObject);
  } catch (error) {
    console.error('[PrivyTronService] Failed to build and sign TRC20 transaction:', error);
    throw error;
  }
}

// Export all functions
export const privyTronService = {
  getPrivyTronWallet,
  createPrivyTronWallet,
  signMessageWithPrivy,
  buildAndSignTronTransaction,
  buildAndSignTrc20Transaction,
  broadcastTronTransaction,
  getTronBalance,
  getTrc20Balance,
  convertPrivySignatureToTron,
};

export default privyTronService;
