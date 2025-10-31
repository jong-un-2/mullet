/**
 * TRON Wallet Creation via Privy Server SDK
 * 
 * Privy's Tier 2 chain support (TRON) requires using the server-side SDK
 * to create embedded wallets, as the client SDK only supports Tier 3 chains
 * (Ethereum and Solana).
 */

import { Hono } from 'hono';
import { PrivyClient } from '@privy-io/server-auth';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// Initialize Privy server client
// Note: This will be initialized per-request with env variables
function getPrivyClient(env: Env) {
  return new PrivyClient(
    env.PRIVY_APP_ID || '',
    env.PRIVY_APP_SECRET || ''
  );
}

/**
 * POST /api/tron-wallet/create
 * Create a TRON embedded wallet for the authenticated user
 * 
 * Request headers:
 *   - Authorization: Bearer <privy-access-token>
 * 
 * Response:
 *   - 200: { address: string, walletId: string, chainType: 'tron' }
 *   - 401: Unauthorized
 *   - 500: Internal server error
 */
app.post('/create', async (c) => {
  try {
    // Initialize Privy client with environment variables
    const privy = getPrivyClient(c.env);

    // Get access token from Authorization header
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }

    const accessToken = authHeader.substring(7);

    // Verify the access token and get user ID
    const claims = await privy.verifyAuthToken(accessToken);
    const userId = claims.userId;

    console.log('[TRON Wallet] Creating TRON wallet for user:', userId);

    // Create TRON embedded wallet using server SDK
    const updatedUser = await privy.createWallets({
      userId,
      wallets: [{
        chainType: 'tron',
        policyIds: [], // No policies initially
      }],
    });

    // Find the newly created TRON wallet
    const tronWallet = updatedUser.linkedAccounts?.find(
      (account: any) => account.type === 'wallet' && account.chainType === 'tron'
    ) as any;

    if (!tronWallet) {
      throw new Error('TRON wallet was not created');
    }

    console.log('[TRON Wallet] Successfully created TRON wallet:', tronWallet.address);

    return c.json({
      address: tronWallet.address,
      walletId: tronWallet.walletId || tronWallet.id,
      chainType: 'tron',
      publicKey: tronWallet.publicKey,
    });

  } catch (error: any) {
    console.error('[TRON Wallet] Failed to create wallet:', error);
    
    // Handle specific errors
    if (error.message?.includes('already has') || error.message?.includes('already exists')) {
      return c.json({
        error: 'User already has a TRON wallet',
        message: 'Each user can only have one embedded wallet per chain type.',
      }, 400);
    }

    return c.json({
      error: 'Failed to create TRON wallet',
      message: error.message || 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/tron-wallet
 * Get the user's TRON wallet if it exists
 * 
 * Request headers:
 *   - Authorization: Bearer <privy-access-token>
 * 
 * Response:
 *   - 200: { address: string, walletId: string, chainType: 'tron' } | { exists: false }
 *   - 401: Unauthorized
 *   - 500: Internal server error
 */
app.get('/', async (c) => {
  try {
    // Initialize Privy client with environment variables
    const privy = getPrivyClient(c.env);

    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }

    const accessToken = authHeader.substring(7);
    const claims = await privy.verifyAuthToken(accessToken);
    const userId = claims.userId;

    // Get user and check for TRON wallet
    const user = await privy.getUser(userId);
    const tronWallet = user.linkedAccounts?.find(
      (account: any) => account.type === 'wallet' && account.chainType === 'tron'
    ) as any;

    if (!tronWallet) {
      return c.json({ exists: false });
    }

    return c.json({
      exists: true,
      address: tronWallet.address,
      walletId: tronWallet.walletId || tronWallet.id,
      chainType: 'tron',
      publicKey: tronWallet.publicKey,
    });

  } catch (error: any) {
    console.error('[TRON Wallet] Failed to get wallet:', error);
    return c.json({
      error: 'Failed to get TRON wallet',
      message: error.message || 'Unknown error',
    }, 500);
  }
});

export default app;
