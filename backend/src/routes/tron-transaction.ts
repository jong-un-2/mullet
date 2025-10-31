import { Hono } from 'hono';
import { PrivyClient } from '@privy-io/server-auth';
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

    // TRON is a Tier 2 chain in Privy
    // For user-owned wallets, we need to generate authorization signature
    // Ref: https://docs.privy.io/controls/authorization-keys/keys/create/user/request
    
    // Verify user's access token first
    const claims = await privy.verifyAuthToken(userAccessToken);
    console.log('[TronTransaction] User verified:', claims.userId);
    
    // Prepare the transaction hash in the format Privy expects
    const hashToSign = transactionHash.startsWith('0x') ? transactionHash : `0x${transactionHash}`;
    
    // Step 1: Request user signing key from Privy
    // This is required for user-owned wallets
    const authString = `${c.env.PRIVY_APP_ID}:${c.env.PRIVY_APP_SECRET}`;
    const base64Auth = btoa(authString);
    
    console.log('[TronTransaction] Requesting user signing key...');
    const userKeyResponse = await fetch(
      'https://api.privy.io/v1/users/me/authorization_keys',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'privy-app-id': c.env.PRIVY_APP_ID!,
          'Authorization': `Bearer ${userAccessToken}`, // User's access token
        },
        body: JSON.stringify({
          public_key_format: 'base64'
        }),
      }
    );

    if (!userKeyResponse.ok) {
      const errorText = await userKeyResponse.text();
      console.error('[TronTransaction] Failed to get user signing key:', errorText);
      return c.json({ 
        error: 'Failed to get user signing key',
        details: errorText
      }, 500);
    }

    const userKeyData = await userKeyResponse.json() as {
      private_key: string;
      public_key: string;
      expires_at: string;
    };

    console.log('[TronTransaction] User signing key obtained, expires at:', userKeyData.expires_at);

    // Step 2: Generate authorization signature
    // We need to sign the request payload with the user's signing key
    const requestUrl = `https://api.privy.io/v1/wallets/${walletId}/raw_sign`;
    const requestBody = {
      params: {
        hash: hashToSign,
      },
    };

    // Build signature payload according to Privy spec
    const signaturePayload = {
      version: 1,
      method: 'POST',
      url: requestUrl,
      body: requestBody,
      headers: {
        'privy-app-id': c.env.PRIVY_APP_ID!,
      },
    };

    // Canonicalize and sign the payload
    // We'll use Web Crypto API available in Cloudflare Workers
    const canonicalPayload = JSON.stringify(signaturePayload);
    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(canonicalPayload);

    // Import the user's private key
    const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${userKeyData.private_key}\n-----END PRIVATE KEY-----`;
    const privateKeyBuffer = encoder.encode(privateKeyPem);
    
    // Parse PEM format and import key
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      base64ToArrayBuffer(userKeyData.private_key),
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      false,
      ['sign']
    );

    // Sign the payload
    const signatureBuffer = await crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: 'SHA-256',
      },
      privateKey,
      payloadBytes
    );

    // Convert signature to base64
    const authorizationSignature = arrayBufferToBase64(signatureBuffer);

    console.log('[TronTransaction] Authorization signature generated');

    // Step 3: Call raw_sign with authorization signature
    const signResponse = await fetch(
      requestUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'privy-app-id': c.env.PRIVY_APP_ID!,
          'Authorization': `Basic ${base64Auth}`,
          'privy-authorization-signature': authorizationSignature,
        },
        body: JSON.stringify(requestBody),
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
