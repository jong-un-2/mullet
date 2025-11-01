import { Hono } from 'hono';
import { PrivyClient as PrivyServerClient } from '@privy-io/server-auth';
import { PrivyClient, type AuthorizationContext } from '@privy-io/node';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// Helper functions for base64 conversion
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

// Initialize Privy server clients
function getPrivyServerClient(env: Env) {
  return new PrivyServerClient(
    env.PRIVY_APP_ID || '',
    env.PRIVY_APP_SECRET || ''
  );
}

function getPrivyNodeClient(env: Env) {
  // Initialize Privy Node SDK client
  return new PrivyClient({
    appId: env.PRIVY_APP_ID || '',
    appSecret: env.PRIVY_APP_SECRET || '',
  });
}

function getAuthorizationContext(env: Env): AuthorizationContext {
  // Get authorization context for Session Signer
  if (!env.SESSION_SIGNER_PRIVATE_KEY) {
    throw new Error('SESSION_SIGNER_PRIVATE_KEY not configured');
  }
  
  console.log('[PrivyClient] Creating authorization context with Session Signer key');
  console.log('[PrivyClient] Key format check:', {
    hasWalletAuthPrefix: env.SESSION_SIGNER_PRIVATE_KEY.startsWith('wallet-auth:'),
    keyLength: env.SESSION_SIGNER_PRIVATE_KEY.length,
    firstChars: env.SESSION_SIGNER_PRIVATE_KEY.substring(0, 20) + '...'
  });
  
  // Remove 'wallet-auth:' prefix if present, as the SDK expects just the base64 key
  const privateKey = env.SESSION_SIGNER_PRIVATE_KEY.startsWith('wallet-auth:')
    ? env.SESSION_SIGNER_PRIVATE_KEY.substring('wallet-auth:'.length)
    : env.SESSION_SIGNER_PRIVATE_KEY;
  
  return {
    authorization_private_keys: [privateKey],
  };
}

/**
 * Sign a TRON transaction on behalf of the user
 * 
 * This endpoint is required because TRON is a Tier 2 chain in Privy,
 * which means raw_sign must be called from the server-side with the app secret.
 * 
 * POST /api/tron-transaction/sign
 * Body: {
 *   walletId: string,
 *   transactionHash: string,  // The transaction ID to sign
 *   publicKey: string
 * }
 */
app.post('/sign', async (c) => {
  try {
    const privyServer = getPrivyServerClient(c.env);
    const privyNode = getPrivyNodeClient(c.env);
    const { walletId, transactionHash, publicKey } = await c.req.json();

    // Validate inputs
    if (!walletId || !transactionHash || !publicKey) {
      return c.json({ 
        error: 'Missing required fields: walletId, transactionHash, publicKey' 
      }, 400);
    }

    // Get user's access token from Authorization header
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        error: 'Missing or invalid Authorization header' 
      }, 401);
    }
    const userAccessToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    console.log('[TronTransaction] Signing transaction:', {
      walletId,
      transactionHash: transactionHash.substring(0, 20) + '...',
      publicKey: publicKey.substring(0, 20) + '...',
      hasAccessToken: !!userAccessToken
    });

    // Verify user's access token first
    const claims = await privyServer.verifyAuthToken(userAccessToken);
    console.log('[TronTransaction] User verified:', claims.userId);
    
    // Get authorization context for Session Signer
    const authContext = getAuthorizationContext(c.env);
    
    // Prepare the transaction hash in the format Privy expects
    const rawTxHex = transactionHash.startsWith('0x') ? transactionHash : `0x${transactionHash}`;
    
    console.log('[TronTransaction] Signing with Privy Node SDK (Session Signer)...');
    
    // Use Privy Node SDK with Session Signer
    // Pass authorization_context to rawSign method
    const signResponse = await privyNode.wallets().rawSign(
      walletId,
      {
        authorization_context: authContext,
        params: {
          hash: rawTxHex,
        },
      }
    );

    const signature = signResponse.signature; // '0x...' 64-byte ECDSA signature
    
    console.log('[TronTransaction] Transaction signed successfully:', signature.substring(0, 20) + '...');

    return c.json({
      signature,
      success: true
    });

  } catch (error) {
    console.error('[TronTransaction] Sign error:', error);
    return c.json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

/**
 * Broadcast a signed TRON transaction
 * 
 * POST /api/tron-transaction/broadcast
 * Body: {
 *   signedTransaction: string  // The signed transaction JSON
 * }
 */
app.post('/broadcast', async (c) => {
  try {
    const { signedTransaction } = await c.req.json();

    if (!signedTransaction) {
      return c.json({ error: 'Missing signedTransaction' }, 400);
    }

    // Forward to Ankr Premium RPC
    const broadcastResponse = await fetch(
      'https://rpc.ankr.com/premium-http/tron/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3/wallet/broadcasttransaction',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(JSON.parse(signedTransaction))
      }
    );

    const result = await broadcastResponse.json() as { 
      result: boolean; 
      txid?: string;
      code?: string;
      message?: string;
    };

    if (!result.result) {
      console.error('[TronTransaction] Broadcast failed:', result);
      return c.json({ 
        error: 'Transaction broadcast failed', 
        details: result 
      }, 500);
    }

    console.log('[TronTransaction] Transaction broadcasted:', result.txid);

    return c.json({
      txid: result.txid,
      success: true,
      result: result.result
    });

  } catch (error) {
    console.error('[TronTransaction] Broadcast error:', error);
    return c.json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default app;
