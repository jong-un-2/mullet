# Privy TRON Wallet Backend Setup Guide

## Overview

This backend API enables TRON embedded wallet creation using Privy's server-side SDK. Since Privy's client SDK (`useCreateWallet`) only supports Tier 3 chains (Ethereum and Solana), we must use the server SDK for Tier 2 chains like TRON.

## Architecture

```
Frontend                Backend API              Privy Server
   |                         |                         |
   |-- POST /create -------->|                         |
   |   (Access Token)        |                         |
   |                         |                         |
   |                         |-- verifyAuthToken ----->|
   |                         |<-- User ID -------------|
   |                         |                         |
   |                         |-- createWallet -------->|
   |                         |   (userId, tron)        |
   |                         |<-- Wallet Data ---------|
   |                         |                         |
   |<-- Wallet Address ------|                         |
```

## Prerequisites

1. **Privy Account**: You must have a Privy account with TRON support enabled
2. **App ID**: Already configured in `wrangler.toml`
3. **App Secret**: Must be obtained from Privy dashboard

## Step 1: Get Privy App Secret

1. Go to [Privy Dashboard](https://dashboard.privy.io/)
2. Select your app: `cmfw7skmh00lfjx0cg4zompxp`
3. Navigate to **Settings** → **API Keys**
4. Copy your **App Secret** (starts with `cmfw7s...`)

⚠️ **Security Warning**: Never commit the App Secret to version control!

## Step 2: Set Cloudflare Secret

For local development:
```bash
# Navigate to backend directory
cd backend

# Set the secret for development
npx wrangler secret put PRIVY_APP_SECRET --env development
# Paste your Privy App Secret when prompted
```

For production:
```bash
# Set the secret for production
npx wrangler secret put PRIVY_APP_SECRET
# Paste your Privy App Secret when prompted
```

## Step 3: Update Env Interface

The `PRIVY_APP_SECRET` is automatically available in Cloudflare Workers environment. Update the `Env` interface in `src/index.ts` if needed:

```typescript
export interface Env {
  // ... existing bindings
  PRIVY_APP_ID?: string;
  PRIVY_APP_SECRET?: string; // Server-side only
}
```

## Step 4: Deploy Backend

```bash
# Development deployment
npm run dev

# Production deployment
npm run deploy
```

## Step 5: Test the API

### Using curl (after getting access token from frontend):

```bash
# Create TRON wallet
curl -X POST https://your-worker.workers.dev/api/tron-wallet/create \
  -H "Authorization: Bearer YOUR_PRIVY_ACCESS_TOKEN" \
  -H "Content-Type: application/json"

# Expected response:
{
  "address": "TXX...",
  "walletId": "clxxx...",
  "chainType": "tron",
  "publicKey": "04xxx..."
}

# Get existing TRON wallet
curl https://your-worker.workers.dev/api/tron-wallet \
  -H "Authorization: Bearer YOUR_PRIVY_ACCESS_TOKEN"

# Expected response (if wallet exists):
{
  "exists": true,
  "address": "TXX...",
  "walletId": "clxxx...",
  "chainType": "tron"
}

# Expected response (if no wallet):
{
  "exists": false
}
```

### Using Frontend

The frontend service (`privyTronService.ts`) will automatically call this API:

```typescript
const address = await createPrivyTronWallet(getAccessToken);
```

## API Endpoints

### POST `/api/tron-wallet/create`

Creates a TRON embedded wallet for the authenticated user.

**Request Headers:**
- `Authorization: Bearer <privy-access-token>` (required)

**Response (200 OK):**
```json
{
  "address": "TXX...",
  "walletId": "clxxx...",
  "chainType": "tron",
  "publicKey": "04xxx..."
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authorization header
- `400 Bad Request`: User already has a TRON wallet
- `500 Internal Server Error`: Failed to create wallet

### GET `/api/tron-wallet`

Retrieves the user's existing TRON wallet.

**Request Headers:**
- `Authorization: Bearer <privy-access-token>` (required)

**Response (200 OK - wallet exists):**
```json
{
  "exists": true,
  "address": "TXX...",
  "walletId": "clxxx...",
  "chainType": "tron",
  "publicKey": "04xxx..."
}
```

**Response (200 OK - no wallet):**
```json
{
  "exists": false
}
```

## Environment Variables

### wrangler.toml (Public Configuration)

```toml
[vars]
PRIVY_APP_ID = "cmfw7skmh00lfjx0cg4zompxp"
```

### Cloudflare Secrets (Sensitive Data)

```bash
wrangler secret put PRIVY_APP_SECRET
```

## Troubleshooting

### Error: "Missing or invalid authorization header"

**Cause**: Frontend didn't send access token

**Solution**: Ensure `getAccessToken()` is called before making the request:

```typescript
const accessToken = await getAccessToken();
```

### Error: "User already has an embedded wallet"

**Cause**: User already has a TRON wallet created

**Solution**: Use the GET endpoint to retrieve the existing wallet:

```typescript
const response = await fetch('/api/tron-wallet', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

### Error: "Failed to verify auth token"

**Cause**: Invalid or expired access token

**Solution**: 
1. Check if user is authenticated in Privy
2. Ensure access token is fresh (not expired)
3. Verify `PRIVY_APP_ID` matches in frontend and backend

### Error: "PRIVY_APP_SECRET is not set"

**Cause**: Cloudflare secret not configured

**Solution**: Run `wrangler secret put PRIVY_APP_SECRET` and enter your secret

## Security Best Practices

1. ✅ **App Secret**: Always use Cloudflare secrets, never commit to git
2. ✅ **Access Token Verification**: Backend verifies every request with Privy
3. ✅ **CORS Configuration**: Limit origins in production
4. ✅ **Rate Limiting**: Consider adding rate limits for wallet creation
5. ✅ **Logging**: Sanitize logs to avoid exposing sensitive data

## Integration with Frontend

The frontend automatically uses this backend API when creating TRON wallets:

```typescript
// frontend/src/services/privyTronService.ts
export async function createPrivyTronWallet(getAccessToken: () => Promise<string | null>): Promise<string> {
  const accessToken = await getAccessToken();
  const response = await fetch(`${API_URL}/api/tron-wallet/create`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  const data = await response.json();
  return data.address;
}
```

## References

- [Privy Server SDK Documentation](https://docs.privy.io/guide/server/wallets/embedded)
- [Privy Authentication Guide](https://docs.privy.io/guide/server/authorization)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [TRON Documentation](https://developers.tron.network/)

## Next Steps

After setting up the backend:

1. ✅ Ensure backend is deployed and accessible
2. ✅ Frontend should automatically use the new API
3. ✅ Test wallet creation in browser
4. ✅ Verify wallet appears in user's linkedAccounts
5. ✅ Test transaction signing with the new wallet

## Migration Summary

**Before (TronLink):**
- Required TronLink browser extension
- Users manage their own private keys
- Separate authentication flow

**After (Privy Tier 2):**
- No browser extension needed
- Privy manages private keys securely
- Unified authentication (same as ETH/SOL)
- Server-side wallet creation (this API)
- Client-side transaction signing
