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

    console.log('[TronTransaction] Signing transaction:', {
      walletId,
      transactionHash: transactionHash.substring(0, 20) + '...',
      publicKey: publicKey.substring(0, 20) + '...'
    });

    // Call Privy's server-side wallet API to sign the raw transaction
    // Note: This approach uses the deprecated rpc() method since walletApi doesn't
    // officially document TRON support yet
    const signResponse = await fetch(
      `https://auth.privy.io/api/v1/wallets/${walletId}/raw_sign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${c.env.PRIVY_APP_SECRET}`,
          'privy-app-id': c.env.PRIVY_APP_ID || '',
        },
        body: JSON.stringify({
          chain_type: 'tron',
          data: transactionHash,
          public_key: publicKey,
        }),
      }
    );

    if (!signResponse.ok) {
      const errorData = await signResponse.json();
      console.error('[TronTransaction] Privy signing failed:', errorData);
      return c.json({ 
        error: 'Failed to sign transaction', 
        details: errorData 
      }, 500);
    }

    const signData = await signResponse.json() as { signature: string };
    
    console.log('[TronTransaction] Transaction signed successfully');

    return c.json({
      signature: signData.signature,
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
