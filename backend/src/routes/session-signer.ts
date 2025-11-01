/**
 * Session Signer Management for TRON Wallets
 * Enables server-side transaction signing for user-owned wallets
 */

import { Hono } from 'hono';
import { PrivyClient } from '@privy-io/server-auth';

const app = new Hono<{ Bindings: any }>();

// Get Privy client with authorization key
function getPrivyClientWithAuthKey(env: any) {
  if (!env.PRIVY_APP_ID || !env.PRIVY_APP_SECRET) {
    throw new Error('PRIVY_APP_ID or PRIVY_APP_SECRET not configured');
  }

  if (!env.SESSION_SIGNER_PRIVATE_KEY) {
    throw new Error('SESSION_SIGNER_PRIVATE_KEY not configured. Please set up Session Signer first.');
  }

  // Initialize Privy client with authorization key for session signing
  const privy = new PrivyClient(
    env.PRIVY_APP_ID,
    env.PRIVY_APP_SECRET,
    {
      walletApi: {
        authorizationPrivateKey: env.SESSION_SIGNER_PRIVATE_KEY,
      },
    }
  );

  return privy;
}

/**
 * Add session signer to user's TRON wallet
 * This allows the server to sign transactions on behalf of the user
 */
app.post('/add-session-signer', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }

    const accessToken = authHeader.substring(7);
    const { walletAddress } = await c.req.json();

    if (!walletAddress) {
      return c.json({ error: 'Missing walletAddress' }, 400);
    }

    console.log('[SessionSigner] Adding session signer for wallet:', walletAddress);

    // Verify user token
    const privy = new PrivyClient(c.env.PRIVY_APP_ID, c.env.PRIVY_APP_SECRET);
    const claims = await privy.verifyAuthToken(accessToken);
    console.log('[SessionSigner] User verified:', claims.userId);

    // Get Session Signer ID from environment
    if (!c.env.SESSION_SIGNER_ID) {
      return c.json({
        error: 'SESSION_SIGNER_ID not configured. Please register your authorization key in Privy Dashboard first.',
      }, 500);
    }

    // Note: The actual addSessionSigners API call should be made from the frontend
    // using Privy React SDK's useSessionSigners hook.
    // This endpoint just validates the configuration.

    console.log('[SessionSigner] Session Signer ID configured:', c.env.SESSION_SIGNER_ID);

    return c.json({
      message: 'Session signer configuration ready',
      signerId: c.env.SESSION_SIGNER_ID,
      walletAddress,
      // Return this info to frontend so it can call addSessionSigners
      instructions: 'Call addSessionSigners from frontend with useSessionSigners hook',
    });

  } catch (error: any) {
    console.error('[SessionSigner] Error:', error);
    return c.json({
      error: error.message || 'Failed to add session signer',
    }, 500);
  }
});

export default app;
