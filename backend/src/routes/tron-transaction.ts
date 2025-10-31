import { Hono } from 'hono';
import { PrivyClient } from '@privy-io/server-auth';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// Initialize Privy server client
function getPrivyClient(env: Env) {
  return new PrivyClient(
    env.PRIVY_APP_ID || '',
    env.PRIVY_APP_SECRET || ''
  );
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
    const privy = getPrivyClient(c.env);
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

    // TRON is a Tier 2 chain in Privy, so raw_sign is not typed in the SDK
    // We need to call the REST API directly with Basic Auth (app secret)
    // Privy requires: privy-app-id header + Authorization: Basic <base64(appId:appSecret)>
    // Ref: https://docs.privy.io/recipes/use-tier-2#tron
    
    // Prepare the transaction hash in the format Privy expects
    // Ensure it's prefixed with 0x
    const hashToSign = transactionHash.startsWith('0x') ? transactionHash : `0x${transactionHash}`;
    
    // Use Basic Auth with app credentials (required for Tier 2 chains)
    const authString = `${c.env.PRIVY_APP_ID}:${c.env.PRIVY_APP_SECRET}`;
    const base64Auth = btoa(authString);
    
    const signResponse = await fetch(
      `https://api.privy.io/v1/wallets/${walletId}/raw_sign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'privy-app-id': c.env.PRIVY_APP_ID!,
          'Authorization': `Basic ${base64Auth}`,
        },
        body: JSON.stringify({
          params: {
            hash: hashToSign,
          },
        }),
      }
    );

    if (!signResponse.ok) {
      const errorText = await signResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      console.error('[TronTransaction] Privy signing failed:', {
        status: signResponse.status,
        statusText: signResponse.statusText,
        error: errorData
      });
      return c.json({ 
        error: 'Failed to sign transaction', 
        details: errorData 
      }, 500);
    }

    // Privy returns {data: {signature: string, encoding: string}}
    const signData = await signResponse.json() as { 
      data: { 
        signature: string;
        encoding: string;
      } 
    };
    
    console.log('[TronTransaction] Transaction signed successfully');

    return c.json({
      signature: signData.data.signature,
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

    // Forward to TronGrid API
    const tronGridApiKey = c.env.TRONGRID_API_KEY || '';
    
    const broadcastResponse = await fetch(
      'https://api.trongrid.io/wallet/broadcasttransaction',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'TRON-PRO-API-KEY': tronGridApiKey
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
